import Link from "next/link";
import { panel, pageHeading, primaryButton } from "@/components/ui/styles";

/** E20: customers and signed-out visitors see no admin data. */
export function StaffOnly({ title, returnTo }: { title: string; returnTo: string }) {
  return (
    <main id="main" className="flex min-w-0 flex-1 flex-col gap-4">
      <h1 className={pageHeading}>{title}</h1>
      <div role="alert" className={panel}>
        <p className="font-semibold">Staff access required</p>
        <p className="text-sm text-muted">Sign in with a staff account to view this page. Customer accounts can’t access the admin console.</p>
        <Link href={`/admin/login?returnTo=${encodeURIComponent(returnTo)}`} className={`${primaryButton} self-start`}>
          Staff sign in
        </Link>
      </div>
    </main>
  );
}
