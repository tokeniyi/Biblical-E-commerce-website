import Link from "next/link";
import { money } from "@/lib/catalog";
import { orderReference } from "@/lib/input";
import { orderStatus, settleOrder } from "@/lib/orders";
import { verifyPayment } from "@/lib/paystack";
import { ClearTrendyBag } from "../../(trendy)/ordering";
import { ClearBag } from "../shopper";

export const metadata = {
  title: "Payment status",
  referrer: "no-referrer" as const,
};

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string | string[];
    order?: string | string[];
    cancelled?: string;
  }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.order;
  const trendy = typeof reference === "string" && reference.startsWith("tl-");
  const bagPath = trendy ? "/shopping-bag" : "/bag";
  if (
    typeof reference !== "string" ||
    !orderReference.test(reference) ||
    !process.env.DATABASE_URL
  ) {
    return (
      <div className="shell inner">
        <h1>Order unavailable</h1>
        <Link className="button" href={bagPath}>
          Return to bag
        </Link>
      </div>
    );
  }

  const order = await orderStatus(reference);
  if (!order) {
    return (
      <div className="shell inner">
        <h1>Order unavailable</h1>
        <Link className="button" href={bagPath}>
          Return to bag
        </Link>
      </div>
    );
  }

  let payment = order.payment;
  if (payment === "pending") {
    const verified = await verifyPayment(reference).catch(() => null);
    if (verified) payment = (await settleOrder(reference, verified.amount)) ?? "pending";
  }

  return (
    <section className="shell inner receipt">
      {payment !== "pending" &&
        (trendy ? <ClearTrendyBag reference={reference} /> : <ClearBag reference={reference} />)}
      <h1>
        {payment === "paid"
          ? "Payment confirmed"
          : payment === "stock_review"
            ? "Payment received"
            : "Payment pending"}
      </h1>
      {payment === "paid" && <p>Your Paystack test order is ready for the store to pack.</p>}
      {payment === "stock_review" && (
        <p>
          Your test payment was received after the stock hold expired. The store needs to review
          availability.
        </p>
      )}
      {payment === "pending" && params.cancelled === "1" && <p>Checkout was cancelled.</p>}
      {payment === "pending" && (
        <p>
          {order.active
            ? "Paystack has not confirmed your payment yet. Refresh this page after completing payment."
            : "The stock hold has expired. If you completed payment, check its status before retrying checkout."}
        </p>
      )}
      <dl className="receipt-details">
        <dt>Order number</dt>
        <dd>{reference}</dd>
        <dt>Total</dt>
        <dd>{money(order.amount)}</dd>
      </dl>
      {payment === "pending" ? (
        <div className="receipt-links">
          <a className="button" href={`/order?reference=${reference}`}>
            Check payment status
          </a>
          <Link href={bagPath} className="back-link">
            Return to bag
          </Link>
        </div>
      ) : (
        <Link className="button" href={trendy ? "/collection" : "/studio/#collection"}>
          Back to collection
        </Link>
      )}
    </section>
  );
}
