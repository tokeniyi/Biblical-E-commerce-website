import { InsightsDashboard } from "@/components/admin/InsightsDashboard";
import { StaffOnly } from "@/components/admin/StaffOnly";
import { eyebrow, pageHeading } from "@/components/ui/styles";
import { loadStaff } from "@/lib/api/staff";

export const metadata = { title: "UX insights · Admin" };

/** UX insights from consented navigation analytics (all staff roles may read). */
export default async function InsightsPage() {
  const staff = await loadStaff();
  if (!staff) return <StaffOnly title="UX insights" returnTo="/admin/insights" />;
  return (
    <main id="main" className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className={eyebrow}>Analytics</p>
        <h1 className={pageHeading}>UX insights</h1>
        <p className="max-w-3xl text-sm text-muted">
          How visitors navigate the store, where they get stuck, and what to fix next. Built from first-party,
          consent-gated tracking: no personal data or form input is recorded.
        </p>
      </div>
      <InsightsDashboard />
    </main>
  );
}
