import Link from "next/link";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { SavedItems } from "@/components/storefront/SavedItems";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { primaryButton, textLink } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";

async function loadSaved() {
  try {
    return (await (await serverApi()).cart.get()).saved;
  } catch (error) {
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

/** C08 Saved for later: distinct from the wishlist and from the purchasable cart. */
export default async function SavedForLaterPage() {
  const saved = await loadSaved();
  return (
    <PageContent screen="C08">
      <h1 className="text-[28px] font-semibold text-ink">Saved for later</h1>
      <p className="text-base">These items are not included in your checkout total.</p>
      {saved ? <SavedItems items={saved} /> : <NetworkError />}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/cart" className={primaryButton}>
          Back to cart
        </Link>
        <Link href="/categories/bibles" className={textLink}>
          Continue shopping
        </Link>
      </div>
      <StatusMessage title="Move item to cart">
        Check price and available quantity before transfer. If stock is unavailable, retain saved item and explain why.
      </StatusMessage>
    </PageContent>
  );
}
