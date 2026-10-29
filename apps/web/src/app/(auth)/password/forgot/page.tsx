import { safeReturnTo } from "@your-app/shared";
import { AuthFrame } from "@/components/account/AuthFrame";
import { ForgotPasswordForm } from "@/components/account/auth/PasswordReset";
import { first, type SearchParams } from "@/lib/search-params";

/** A04 Forgot your password? Always a generic answer; the safe returnTo is kept. */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const returnTo = safeReturnTo(first((await searchParams).returnTo));
  return (
    <AuthFrame screen="A04" title="Forgot your password?">
      <ForgotPasswordForm returnTo={returnTo} />
    </AuthFrame>
  );
}
