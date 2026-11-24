import { Pool, type PoolClient } from "pg";
import { variants } from "./catalog";

let pool: Pool | undefined;
let ready: Promise<void> | undefined;

const schema = `
  CREATE SCHEMA IF NOT EXISTS fashion;
  CREATE TABLE IF NOT EXISTS fashion.inventory (
    variant_id text PRIMARY KEY,
    quantity integer NOT NULL CHECK (quantity >= 0)
  );
  CREATE TABLE IF NOT EXISTS fashion.orders (
    reference text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    amount integer NOT NULL CHECK (amount > 0),
    payment text NOT NULL DEFAULT 'pending' CHECK (payment IN ('pending', 'paid', 'stock_review')),
    fulfilment text NOT NULL DEFAULT 'unfulfilled' CHECK (fulfilment IN ('unfulfilled', 'packed', 'shipped', 'delivered')),
    created_at timestamptz NOT NULL DEFAULT now(),
    hold_until timestamptz NOT NULL,
    paid_at timestamptz
  );
  CREATE TABLE IF NOT EXISTS fashion.order_items (
    reference text NOT NULL REFERENCES fashion.orders(reference),
    variant_id text NOT NULL REFERENCES fashion.inventory(variant_id),
    name text NOT NULL,
    colour text NOT NULL,
    size text NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price integer NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (reference, variant_id)
  );
  CREATE INDEX IF NOT EXISTS fashion_hold_idx ON fashion.order_items(variant_id);
  CREATE INDEX IF NOT EXISTS fashion_orders_recent_idx ON fashion.orders(created_at DESC);
`;

async function inTransaction<T>(connectionPool: Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await connectionPool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function database() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 });
    pool.on("error", (error) => console.error("Fashion database connection error", error.name));
  }
  const connectionPool = pool;
  ready ??= inTransaction(connectionPool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(791124301)");
    await client.query(schema);
    await client.query(
      `INSERT INTO fashion.inventory (variant_id, quantity)
       SELECT * FROM unnest($1::text[], $2::integer[])
       ON CONFLICT (variant_id) DO NOTHING`,
      [variants.map((variant) => variant.id), variants.map((variant) => variant.quantity)],
    );
  }).catch((error) => {
    ready = undefined;
    throw error;
  });
  await ready;
  return connectionPool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  return inTransaction(await database(), work);
}
