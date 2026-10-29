import { SavedAddressForm } from "@/components/account/SavedAddressForm";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";

const RETURN_TO = "/account/addresses/new";

/** A09 form variant: add an address. */
export default async function NewAddressPage() {
  const session = await requireCustomerPage(RETURN_TO);
  const book = await loadAccountData(RETURN_TO, (api) => api.account.addresses());
  return (
    <PageContent screen="A09">
      <h1 className="text-[28px] font-semibold text-ink">Delivery addresses</h1>
      {book ? (
        <SavedAddressForm address={null} defaultEmail={session.email} isFirst={book.addresses.length === 0} />
      ) : (
        <NetworkError />
      )}
    </PageContent>
  );
}
