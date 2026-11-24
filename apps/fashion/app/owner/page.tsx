import { fulfilmentSteps, money } from "@/lib/catalog";
import { ownerOrders } from "@/lib/orders";
import { isOwner, ownerEnabled } from "@/lib/owner";
import { logIn, logOut, updateOrder } from "./actions";

export const metadata = { title: "Store owner" };
export const dynamic = "force-dynamic";
const dateFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!ownerEnabled())
    return (
      <section className="shell inner">
        <h1>Store owner</h1>
        <p>Owner access has not been configured for this deployment.</p>
      </section>
    );
  if (!(await isOwner())) {
    const { error } = await searchParams;
    return (
      <section className="shell inner owner-login">
        <h1>Store owner</h1>
        <form action={logIn} className="shop-form">
          <label>
            Owner password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              maxLength={512}
              required
            />
          </label>
          {error === "login" && (
            <p role="alert" className="feedback">
              Password was incorrect.
            </p>
          )}
          <button type="submit" className="button">
            Sign in
          </button>
        </form>
      </section>
    );
  }

  const orders = await ownerOrders();
  return (
    <section className="shell inner">
      <div className="owner-header">
        <div>
          <h1>Orders</h1>
          <p className="muted">Verified Paystack test orders and fulfilment.</p>
        </div>
        <form action={logOut}>
          <button type="submit" className="button secondary">
            Sign out
          </button>
        </form>
      </div>
      {!orders.length && <p className="empty">No paid orders yet.</p>}
      <div className="orders">
        {orders.map((order) => {
          const next = fulfilmentSteps[fulfilmentSteps.indexOf(order.fulfilment) + 1];
          return (
            <article className="order-card" key={order.reference}>
              <div className="owner-header">
                <div>
                  <h2>{order.name}</h2>
                  <p>
                    {dateFormat.format(order.paid_at)} · {money(order.amount)}
                  </p>
                </div>
                <span className="order-status">
                  {order.payment === "stock_review" ? "Stock review" : order.fulfilment}
                </span>
              </div>
              <p className="order-ref">{order.reference}</p>
              <ul>
                {order.items.map((item) => (
                  <li key={`${item.name}-${item.colour}-${item.size}`}>
                    {item.quantity} × {item.name} · {item.colour} / {item.size}
                  </li>
                ))}
              </ul>
              <details>
                <summary>Delivery details</summary>
                <p>
                  {order.address}
                  <br />
                  {order.phone}
                  <br />
                  {order.email}
                </p>
              </details>
              {order.payment === "stock_review" && (
                <p className="feedback">
                  Payment verified. Stock was unavailable after the hold expired. Review the
                  transaction in the Paystack dashboard.
                </p>
              )}
              {order.payment === "paid" && next && (
                <form action={updateOrder}>
                  <input type="hidden" name="reference" value={order.reference} />
                  <input type="hidden" name="current" value={order.fulfilment} />
                  <button type="submit" className="button secondary">
                    Mark as {next}
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
