import { safeReturnTo } from "@your-app/shared";
import { AuthFrame } from "@/components/account/AuthFrame";
import { ResetSent } from "@/components/account/auth/PasswordReset";
import { first, type SearchParams } from "@/lib/search-params";

/** A05 Check your email: identical for registered and unregistered addresses. */
export default async function ResetSentPage({ searchParams }: { searchParams: SearchParams }) {
  const returnTo = safeReturnTo(first((await searchParams).returnTo));
  return (
    <AuthFrame screen="A05" title="Check your email">
      <ResetSent returnTo={returnTo} />
    </AuthFrame>
  );
}
