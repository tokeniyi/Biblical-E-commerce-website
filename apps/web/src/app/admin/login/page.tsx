import Link from "next/link";
import { SignInForm } from "@/components/auth/AuthForms";
import { Logo } from "@/components/shell/StorefrontShell";
import { eyebrow, pageHeading } from "@/components/ui/styles";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata = { title: "Staff sign in" };

/** B01 Staff sign in: customer accounts are refused with the same generic error. */
export default async function AdminLoginPage({ searchParams }: Props) {
  const raw = (await searchParams).returnTo;
  const returnTo = (Array.isArray(raw) ? raw[0] : raw) ?? null;
  return (
    <main id="main" data-screen="B01" className="grid min-h-screen place-items-center bg-ink p-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white p-8 shadow-lift sm:p-10">
        <Logo suffix="Admin" />
        <div className="flex flex-col gap-1">
          <p className={eyebrow}>Staff only</p>
          <h1 className={pageHeading}>Staff sign in</h1>
          <p className="text-sm text-muted">Customer accounts can’t access the admin console.</p>
        </div>
        <SignInForm returnTo={returnTo} audience="staff" />
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          Back to the store
        </Link>
      </div>
    </main>
  );
}
