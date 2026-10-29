import { WishlistGrid } from "@/components/account/WishlistGrid";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";

const RETURN_TO = "/account/wishlist";

/** A12 Your wishlist (E03 when empty). Signed out → A14 with returnTo. */
export default async function WishlistPage() {
  await requireCustomerPage(RETURN_TO);
  const data = await loadAccountData(RETURN_TO, (api) => api.account.wishlist());
  return (
    <PageContent screen="A12">
      <h1 className="text-[28px] font-semibold text-ink">Your wishlist</h1>
      {data ? <WishlistGrid items={data.items} /> : <NetworkError />}
    </PageContent>
  );
}
