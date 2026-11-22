import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/AuthForms";
import { PageContent } from "@/components/shell/StorefrontShell";
import { statusBox } from "@/components/ui/styles";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

const REASONS: Record<string, string> = {
  "session-expired": "Your session expired. Sign in again to continue where you left off.",
  "signed-out": "You’ve been signed out.",
  required: "Sign in to see your account.",
};

export const metadata = { title: "Sign in" };

/** A01 Sign in, with A14 (sign in required / session expired) as `?reason=`. */
export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const returnTo = first(sp.returnTo);
  const reason = first(sp.reason);
  const registerHref = returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register";
  return (
    <PageContent screen={reason === "session-expired" || reason === "required" ? "A01 A14" : "A01"}>
      <AuthCard
        kicker="Welcome back"
        title="Sign in"
        intro={
          <>
            New here?{" "}
            <Link href={registerHref} className="font-semibold text-brand underline underline-offset-4">
              Create an account
            </Link>
          </>
        }
        notice={
          reason && REASONS[reason] ? (
            <p role="status" className={statusBox}>
              {REASONS[reason]}
            </p>
          ) : null
        }
      >
        <SignInForm returnTo={returnTo} />
      </AuthCard>
    </PageContent>
  );
}
