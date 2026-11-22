import Link from "next/link";
import { formatCents, type AdminOverview, type Insights } from "@your-app/shared";
import { StatusBadge, formatDate } from "@/components/account/OrderStatus";
import { StaffOnly } from "@/components/admin/StaffOnly";
import { eyebrow, pageHeading, panel, textLink } from "@/components/ui/styles";
import { serverApi } from "@/lib/api/server";
import { loadStaff } from "@/lib/api/staff";

export const metadata = { title: "Admin" };

/** B02 Admin overview: sales snapshot plus the top UX findings. */
export default async function AdminOverviewPage() {
  const staff = await loadStaff();
  if (!staff) return <StaffOnly title="Admin overview" returnTo="/admin" />;
  const api = await serverApi();
  const [overview, insights]: [AdminOverview, Insights] = await Promise.all([
    api.admin.overview(),
    api.admin.insights({ range: "7d", demo: "include" }),
  ]);
  const tiles = [
    { label: "Orders", value: String(overview.orderCount) },
    { label: "Revenue", value: formatCents(overview.revenueCents) },
    { label: "Avg. order", value: formatCents(overview.averageOrderCents) },
    { label: "To fulfill", value: String(overview.unfulfilledCount) },
    { label: "Sessions (7d)", value: String(insights.kpis.sessions) },
    { label: "Conversion (7d)", value: `${String(insights.kpis.conversionRate)}%` },
  ];
  return (
    <main id="main" data-screen="B02" className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <p className={eyebrow}>Welcome back, {staff.name}</p>
        <h1 className={pageHeading}>Admin overview</h1>
      </div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6" aria-label="Store metrics">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{t.value}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="recent-heading" className={panel}>
          <h2 id="recent-heading" className="font-display text-xl font-semibold">
            Recent orders
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="py-2">Order</th>
                <th scope="col">Placed</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 font-semibold">{o.id}</td>
                  <td>{formatDate(o.placedAt)}</td>
                  <td>
                    <StatusBadge status={o.fulfillmentStatus} />
                  </td>
                  <td className="text-right font-semibold">{formatCents(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section aria-labelledby="ux-heading" className={panel}>
          <div className="flex items-center justify-between">
            <h2 id="ux-heading" className="font-display text-xl font-semibold">
              Top UX findings
            </h2>
            <Link href="/admin/insights" className={textLink}>
              All insights
            </Link>
          </div>
          <ul className="flex flex-col gap-3 text-sm">
            {insights.recommendations.slice(0, 4).map((r) => (
              <li key={r.id} className="rounded-xl border border-line p-3">
                <p className="font-semibold">{r.title}</p>
                <p className="text-muted">{r.evidence}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section aria-labelledby="stock-heading" className={panel}>
        <h2 id="stock-heading" className="font-display text-xl font-semibold">
          Low stock
        </h2>
        {overview.lowStock.length === 0 ? (
          <p className="text-sm text-muted">All published editions are well stocked.</p>
        ) : (
          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {overview.lowStock.map((v) => (
              <li key={v.sku} className="rounded-xl bg-panel p-3">
                <p className="font-semibold">{v.productName}</p>
                <p className="text-muted">
                  {v.sku} · {v.available === 0 ? "Sold out" : `${String(v.available)} left`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
