import Link from "next/link";
import {
  ACCOUNT_ORDER_STATUSES,
  accountOrdersQueryToParams,
  formatCents,
  parseAccountOrdersQuery,
  type AccountOrdersQuery,
} from "@your-app/shared";
import { NoOrders } from "@/components/account/EmptyStates";
import { orderStatusLine, placedDate, statusLabel } from "@/components/account/format";
import { inputClass } from "@/components/forms/Field";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { fieldBox, fieldLabel, primaryButton, secondaryButton } from "@/components/ui/styles";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";
import type { SearchParams } from "@/lib/search-params";

function href(query: AccountOrdersQuery): string {
  return `/account/orders?${accountOrdersQueryToParams(query).toString()}`;
}

/**
 * A10 Your orders. Filters, search and page live in the URL; the server
 * returns only this customer's orders. No account orders at all → E04.
 */
export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseAccountOrdersQuery(await searchParams);
  const returnTo = href(query);
  await requireCustomerPage(returnTo);
  const data = await loadAccountData(returnTo, (api) => api.account.orders(query));

  return (
    <PageContent screen="A10">
      <h1 className="text-[28px] font-semibold text-ink">Your orders</h1>
      {!data ? (
        <NetworkError />
      ) : !data.hasOrders ? (
        <NoOrders />
      ) : (
        <>
          {/* A plain GET form: the URL owns the filter, and a change starts at page 1. */}
          <form action="/account/orders" className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className={`${fieldBox} flex-1`}>
              <label htmlFor="status" className={fieldLabel}>
                Order status
              </label>
              <select id="status" name="status" defaultValue={data.query.status} className={inputClass}>
                {ACCOUNT_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All" : statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${fieldBox} flex-1`}>
              <label htmlFor="q" className={fieldLabel}>
                Search order number
              </label>
              <input id="q" name="q" type="search" defaultValue={data.query.q} placeholder="BS-…" className={inputClass} />
            </div>
            <input type="hidden" name="page" value="1" />
            <button type="submit" className={`${secondaryButton} self-start sm:self-auto`}>
              Show orders
            </button>
          </form>

          {data.items.length === 0 ? (
            <p className="text-base">
              No orders match these filters.{" "}
              <Link href="/account/orders" className="underline">
                Show all orders
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[640px] text-left font-mono text-[13px] leading-snug">
                <thead className="bg-band">
                  <tr>
                    <th scope="col" className="p-3 font-semibold">Order</th>
                    <th scope="col" className="p-3 font-semibold">Placed</th>
                    <th scope="col" className="p-3 font-semibold">Status</th>
                    <th scope="col" className="p-3 font-semibold">Total</th>
                    <th scope="col" className="p-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.id} className="border-t border-band">
                      <th scope="row" className="p-3 font-normal">
                        {o.id}
                      </th>
                      <td className="p-3">{placedDate(o.placedAt)}</td>
                      <td className="p-3">{orderStatusLine(o)}</td>
                      <td className="p-3">{formatCents(o.totalCents)}</td>
                      <td className="p-3">
                        <Link href={`/account/orders/${encodeURIComponent(o.id)}`} className="underline" aria-label={`Details for ${o.id}`}>
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted">
              {data.total === 0
                ? "Showing 0 orders"
                : `Showing ${String((data.page - 1) * data.pageSize + 1)}–${String(Math.min(data.page * data.pageSize, data.total))} of ${String(data.total)} ${data.total === 1 ? "order" : "orders"}`}
            </p>
            {data.pageCount > 1 ? (
              <ul className="flex gap-3">
                <li>
                  {data.page > 1 ? <Link href={href({ ...data.query, page: data.page - 1 })}>‹ Previous</Link> : <span className="text-muted">‹ Previous</span>}
                </li>
                {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((p) => (
                  <li key={p}>
                    <Link href={href({ ...data.query, page: p })} aria-current={p === data.page ? "page" : undefined}>
                      {p === data.page ? `[${String(p)}]` : p}
                    </Link>
                  </li>
                ))}
                <li>
                  {data.page < data.pageCount ? <Link href={href({ ...data.query, page: data.page + 1 })}>Next ›</Link> : <span className="text-muted">Next ›</span>}
                </li>
              </ul>
            ) : null}
          </nav>

          <StatusMessage title="Bought as a guest?">
            Use{" "}
            <Link href="/orders/lookup" className="underline">
              guest lookup
            </Link>
            . To link a guest purchase to your account, verify the matching purchase email; order number alone is insufficient.
          </StatusMessage>
          <Link href="/categories/bibles" className={`${primaryButton} self-start`}>
            Keep shopping
          </Link>
        </>
      )}
    </PageContent>
  );
}
