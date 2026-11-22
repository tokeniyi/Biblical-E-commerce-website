import { PageContent } from "@/components/shell/StorefrontShell";
import { WishlistGrid } from "@/components/account/WishlistGrid";
import { pageHeading } from "@/components/ui/styles";
import { requireCustomerPage } from "@/lib/api/account";

export const metadata = { title: "Wishlist" };

/** A12 Wishlist. */
export default async function WishlistPage() {
  const { api } = await requireCustomerPage("/account/wishlist");
  const { items } = await api.wishlist.items();
  return (
    <PageContent screen="A12">
      <h1 className={pageHeading}>Wishlist</h1>
      <WishlistGrid initialItems={items} />
    </PageContent>
  );
}
