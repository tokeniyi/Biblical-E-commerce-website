import { PageContent } from "@/components/shell/StorefrontShell";
import { pageHeading, panel } from "@/components/ui/styles";
import { requireCustomerPage } from "@/lib/api/account";

export const metadata = { title: "Profile" };

/** A08 Profile (read view; editing is a follow-up). */
export default async function ProfilePage() {
  const { api } = await requireCustomerPage("/account/profile");
  const profile = await api.account.profile();
  return (
    <PageContent screen="A08">
      <h1 className={pageHeading}>Profile</h1>
      <section className={panel} aria-label="Profile details">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="font-semibold">Name</dt>
          <dd>{profile.name}</dd>
          <dt className="font-semibold">Email</dt>
          <dd>{profile.email}</dd>
          <dt className="font-semibold">Email status</dt>
          <dd>{profile.emailVerified ? "Verified" : "Not verified yet"}</dd>
          <dt className="font-semibold">Marketing emails</dt>
          <dd>{profile.marketingOptIn ? "Subscribed" : "Not subscribed"}</dd>
        </dl>
      </section>
    </PageContent>
  );
}
