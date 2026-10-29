import { CartEditor } from "@/components/checkout/CartEditor";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { loadCheckout } from "@/lib/api/checkout";

/** O01 Your cart; E01 when empty, E06 when the server's stock or prices moved, E08 on the promo field. */
export default async function CartPage() {
  const view = await loadCheckout();
  return (
    <PageContent screen="O01">
      {view ? (
        <CartEditor initial={view} />
      ) : (
        <>
          <h1 className="text-[28px] font-semibold text-ink">Your cart</h1>
          <NetworkError />
        </>
      )}
    </PageContent>
  );
}
