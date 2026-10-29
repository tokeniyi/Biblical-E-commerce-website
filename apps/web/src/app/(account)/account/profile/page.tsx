import Link from "next/link";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { panel, primaryButton } from "@/components/ui/styles";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";

const RETURN_TO = "/account/profile";

/** A08 Profile details, with the Security panel (password changes go through the reset flow). */
export default async function ProfilePage() {
  await requireCustomerPage(RETURN_TO);
  const profile = await loadAccountData(RETURN_TO, (api) => api.account.profile());
  return (
    <PageContent screen="A08">
      <h1 className="text-[28px] font-semibold text-ink">Profile details</h1>
      {!profile ? (
        <NetworkError />
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <ProfileForm profile={profile} />
          <section aria-labelledby="security-title" className={`${panel} w-full md:w-[300px] md:shrink-0`}>
            <h2 id="security-title" className="text-base font-semibold">
              Security
            </h2>
            <p className="text-sm">Change password through a verified reset flow.</p>
            <Link href="/password/forgot?returnTo=%2Faccount%2Fprofile" className={`${primaryButton} self-start`}>
              Reset password
            </Link>
          </section>
        </div>
      )}
    </PageContent>
  );
}
