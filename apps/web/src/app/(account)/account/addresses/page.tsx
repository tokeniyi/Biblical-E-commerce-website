import { PageContent } from "@/components/shell/StorefrontShell";
import { badge, pageHeading, panel } from "@/components/ui/styles";
import { requireCustomerPage } from "@/lib/api/account";

export const metadata = { title: "Addresses" };

/** A09 Address book (read view; new addresses are saved from checkout). */
export default async function AddressesPage() {
  const { api } = await requireCustomerPage("/account/addresses");
  const { addresses } = await api.account.profile();
  return (
    <PageContent screen="A09">
      <h1 className={pageHeading}>Addresses</h1>
      {addresses.length === 0 ? (
        <p className={panel}>No saved addresses yet. Tick “Save this address” at checkout to add one.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={panel}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{a.fullName}</p>
                {a.isDefault ? <span className={`${badge} bg-brand-soft text-brand`}>Default</span> : null}
              </div>
              <address className="text-sm not-italic text-muted">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.state} {a.zip}, {a.country}
              </address>
            </li>
          ))}
        </ul>
      )}
    </PageContent>
  );
}
