"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents, type WishlistItem } from "@your-app/shared";
import { BookCover } from "@/components/storefront/BookCover";
import { StockBadge } from "@/components/storefront/ProductCard";
import { panel, primaryButton, secondaryButton } from "@/components/ui/styles";
import { track } from "@/lib/analytics/tracker";
import { ApiError, api } from "@/lib/api/client";

/** A12 grid: move to cart (server rechecks stock/price) or remove. */
export function WishlistGrid({ initialItems }: { initialItems: WishlistItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function addToCart(item: WishlistItem) {
    setBusy(item.sku);
    setMessage("");
    try {
      await api.cart.addLine({ sku: item.sku, quantity: 1 });
      track("add_to_cart", { sku: item.sku, quantity: 1, priceCents: item.priceCents, source: "wishlist" });
      setMessage(`Added ${item.productName} to your cart.`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Couldn’t add to cart. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: WishlistItem) {
    setBusy(item.sku);
    try {
      setItems((await api.wishlist.remove(item.sku)).items);
      setMessage(`Removed ${item.productName} from your wishlist.`);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Couldn’t remove. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <p role="status" className={message ? "rounded-xl bg-panel p-3 text-sm" : "sr-only"}>
        {message}
      </p>
      {items.length === 0 ? (
        <div className={panel}>
          <p>Your wishlist is empty. Tap ♡ Save on any Bible to keep it here.</p>
          <Link href="/categories/bibles" className={`${primaryButton} self-start`}>
            Browse Bibles
          </Link>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.sku} className={`${panel} gap-3`}>
              <BookCover title={item.productName} translation={item.translation} binding={item.binding} decorative />
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">
                  <Link href={`/products/${item.productSlug}?variant=${encodeURIComponent(item.sku)}`} className="hover:text-brand">
                    {item.productName}
                  </Link>
                </h2>
                <StockBadge available={item.available} />
              </div>
              <p className="text-sm text-muted">{item.variantLabel}</p>
              <p className="text-lg font-semibold">{formatCents(item.priceCents)}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButton}
                  disabled={item.available <= 0 || busy === item.sku}
                  onClick={() => void addToCart(item)}
                  aria-label={`Add ${item.productName} to cart`}
                >
                  {item.available <= 0 ? "Sold out" : "Add to cart"}
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={busy === item.sku}
                  onClick={() => void remove(item)}
                  aria-label={`Remove ${item.productName} from wishlist`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
