import { SavedAddressForm } from "@/components/account/SavedAddressForm";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";

type Props = { params: Promise<{ addressId: string }> };

/** A09 form variant: edit one of the customer's own addresses (any other id is a 404). */
export default async function EditAddressPage({ params }: Props) {
  const { addressId } = await params;
  const returnTo = `/account/addresses/${encodeURIComponent(addressId)}/edit`;
  const session = await requireCustomerPage(returnTo);
  const address = await loadAccountData(returnTo, (api) => api.account.address(addressId));
  return (
    <PageContent screen="A09">
      <h1 className="text-[28px] font-semibold text-ink">Delivery addresses</h1>
      {address ? <SavedAddressForm address={address} defaultEmail={session.email} isFirst={false} /> : <NetworkError />}
    </PageContent>
  );
}
