import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/AuthForms";
import { PageContent } from "@/components/shell/StorefrontShell";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export const metadata = { title: "Create account" };

/** A02 Create account. */
export default async function RegisterPage({ searchParams }: Props) {
  const returnTo = first((await searchParams).returnTo);
  const loginHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
  return (
    <PageContent screen="A02">
      <AuthCard
        kicker="Join Bible Store"
        title="Create account"
        intro={
          <>
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-brand underline underline-offset-4">
              Sign in
            </Link>
          </>
        }
      >
        <RegisterForm returnTo={returnTo} />
      </AuthCard>
    </PageContent>
  );
}
