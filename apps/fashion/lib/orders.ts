import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { database, transaction } from "./db";
import { deliveryFee, fulfilmentSteps, variants, type Fulfilment } from "./catalog";
import { StoreError, type CheckoutInput } from "./input";

const stockQuery = `
  SELECT inventory.variant_id,
         GREATEST(0, inventory.quantity - COALESCE(sum(items.quantity)
           FILTER (WHERE orders.payment = 'pending' AND orders.hold_until > statement_timestamp()), 0))::int AS available
  FROM fashion.inventory AS inventory
  LEFT JOIN fashion.order_items AS items USING (variant_id)
  LEFT JOIN fashion.orders AS orders USING (reference)
`;

async function lockStock(client: PoolClient, ids: string[]) {
  await client.query(
    "SELECT variant_id FROM fashion.inventory WHERE variant_id = ANY($1) ORDER BY variant_id FOR UPDATE",
    [ids],
  );
}

export async function productStock(slug: string) {
  const stock = variants.filter((variant) => variant.slug === slug);
  if (!process.env.DATABASE_URL) return stock;

  const db = await database();
  const { rows } = await db.query<{ variant_id: string; available: number }>(
    `${stockQuery} WHERE inventory.variant_id = ANY($1) GROUP BY inventory.variant_id`,
    [stock.map((variant) => variant.id)],
  );
  const availability = new Map(rows.map((row) => [row.variant_id, row.available]));
  return stock.map((variant) => ({ ...variant, quantity: availability.get(variant.id) ?? 0 }));
}

export async function reserveOrder(input: CheckoutInput) {
  const lines = input.items.map((item) => {
    const variant = variants.find((entry) => entry.id === item.id);
    if (!variant) throw new StoreError("A style in your bag is no longer available.");
    return { ...item, variant };
  });
  const amount = lines.reduce(
    (total, item) => total + item.quantity * item.variant.price,
    deliveryFee,
  );
  const reference = `sf-${randomBytes(16).toString("hex")}`;

  await transaction(async (client) => {
    const ids = lines.map((item) => item.id);
    await lockStock(client, ids);
    const { rows } = await client.query<{ variant_id: string; available: number }>(
      `${stockQuery} WHERE inventory.variant_id = ANY($1) GROUP BY inventory.variant_id`,
      [ids],
    );
    const quantities = new Map(rows.map((row) => [row.variant_id, row.available]));
    for (const item of lines) {
      if ((quantities.get(item.id) ?? 0) < item.quantity) {
        const { name, colour, size } = item.variant;
        throw new StoreError(
          `${name} in ${colour}, size ${size}, has insufficient stock. Update your bag and try again.`,
          409,
        );
      }
    }
    await client.query(
      `INSERT INTO fashion.orders (reference, name, email, phone, address, amount, hold_until)
       VALUES ($1, $2, $3, $4, $5, $6, statement_timestamp() + interval '15 minutes')`,
      [reference, input.name, input.email, input.phone, input.address, amount],
    );
    for (const item of lines) {
      const { name, colour, size, price } = item.variant;
      await client.query(
        `INSERT INTO fashion.order_items (reference, variant_id, name, colour, size, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reference, item.id, name, colour, size, item.quantity, price],
      );
    }
  });
  return { reference, amount };
}

export async function releaseHold(reference: string) {
  const db = await database();
  await db.query(
    "UPDATE fashion.orders SET hold_until = statement_timestamp() WHERE reference = $1 AND payment = 'pending'",
    [reference],
  );
}

type Payment = "pending" | "paid" | "stock_review";

export async function orderStatus(reference: string) {
  const db = await database();
  const { rows } = await db.query<{ payment: Payment; amount: number; active: boolean }>(
    "SELECT payment, amount, hold_until > statement_timestamp() AS active FROM fashion.orders WHERE reference = $1",
    [reference],
  );
  return rows[0];
}

export async function settleOrder(reference: string, amount: number) {
  return transaction(async (client) => {
    const { rows: items } = await client.query<{ variant_id: string; quantity: number }>(
      "SELECT variant_id, quantity FROM fashion.order_items WHERE reference = $1",
      [reference],
    );
    const ids = items.map((item) => item.variant_id);
    await lockStock(client, ids);
    const {
      rows: [order],
    } = await client.query<{ amount: number; payment: Payment; active: boolean }>(
      "SELECT amount, payment, hold_until > statement_timestamp() AS active FROM fashion.orders WHERE reference = $1 FOR UPDATE",
      [reference],
    );
    if (!order || amount !== order.amount) return null;
    if (order.payment !== "pending") return order.payment;

    // An expired order may only take stock that is free of other active holds.
    const { rows } = order.active
      ? await client.query<{ variant_id: string; available: number }>(
          "SELECT variant_id, quantity AS available FROM fashion.inventory WHERE variant_id = ANY($1)",
          [ids],
        )
      : await client.query<{ variant_id: string; available: number }>(
          `${stockQuery} WHERE inventory.variant_id = ANY($1) GROUP BY inventory.variant_id`,
          [ids],
        );
    const available = new Map(rows.map((row) => [row.variant_id, row.available]));
    const payment =
      items.length > 0 &&
      items.every((item) => (available.get(item.variant_id) ?? 0) >= item.quantity)
        ? "paid"
        : "stock_review";

    if (payment === "paid") {
      for (const item of items) {
        await client.query(
          "UPDATE fashion.inventory SET quantity = quantity - $2 WHERE variant_id = $1",
          [item.variant_id, item.quantity],
        );
      }
    }
    await client.query(
      "UPDATE fashion.orders SET payment = $2, paid_at = now() WHERE reference = $1",
      [reference, payment],
    );
    return payment;
  });
}

type OwnerOrder = {
  reference: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  amount: number;
  paid_at: Date;
  payment: "paid" | "stock_review";
  fulfilment: Fulfilment;
  items: { name: string; colour: string; size: string; quantity: number; unit_price: number }[];
};

export async function ownerOrders() {
  const db = await database();
  const { rows } = await db.query<OwnerOrder>(`
    SELECT orders.*, (
      SELECT json_agg(order_items ORDER BY order_items.variant_id)
      FROM fashion.order_items WHERE order_items.reference = orders.reference
    ) AS items
    FROM fashion.orders AS orders
    WHERE payment IN ('paid', 'stock_review')
    ORDER BY paid_at DESC LIMIT 100
  `);
  return rows;
}

export async function advanceFulfilment(reference: string, current: Fulfilment) {
  const next = fulfilmentSteps[fulfilmentSteps.indexOf(current) + 1];
  if (!next || current === "delivered") return;
  const db = await database();
  await db.query(
    "UPDATE fashion.orders SET fulfilment = $3 WHERE reference = $1 AND fulfilment = $2 AND payment = 'paid'",
    [reference, current, next],
  );
}
