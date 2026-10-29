import { AddressBook } from "@/components/account/AddressBook";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";
import { first, type SearchParams } from "@/lib/search-params";

const RETURN_TO = "/account/addresses";

/** A09 Delivery addresses (list / empty). The default only affects future checkouts. */
export default async function AddressesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCustomerPage(RETURN_TO);
  const status = first((await searchParams).status);
  const book = await loadAccountData(RETURN_TO, (api) => api.account.addresses());
  return (
    <PageContent screen="A09">
      <h1 className="text-[28px] font-semibold text-ink">Delivery addresses</h1>
      {book ? (
        <AddressBook addresses={book.addresses} notice={status === "saved" || status === "deleted" ? status : null} />
      ) : (
        <NetworkError />
      )}
    </PageContent>
  );
}
