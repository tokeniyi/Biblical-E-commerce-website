"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatCents, type WishlistItem } from "@your-app/shared";
import { BookCover } from "@/components/storefront/BookCover";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { panel, secondaryButton } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { signInRedirect } from "@/lib/auth-redirect";
import { useHydrated } from "@/lib/use-hydrated";
import { EmptyWishlist } from "./EmptyStates";
import { plural } from "./format";

const RETURN_TO = "/account/wishlist";

/**
 * A12. Move to cart rechecks stock and price on the server and opens C07;
 * the item stays in the wishlist. Out-of-stock items can't be moved and
 * offer alternatives. Remove asks first. Empty → E03.
 */
export function WishlistGrid({ items: initial }: { items: WishlistItem[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [items, setItems] = useState(initial);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ sku: string; message: string } | null>(null);
  const [confirming, setConfirming] = useState<WishlistItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  function handleAuth(e: unknown): boolean {
    const redirect = signInRedirect(e, RETURN_TO);
    if (redirect) router.push(redirect);
    return redirect !== null;
  }

  async function move(item: WishlistItem) {
    setBusySku(item.sku);
    setRowError(null);
    try {
      await api.cart.addLine({ sku: item.sku, quantity: 1 });
      router.push(`/products/${item.productSlug}?variant=${encodeURIComponent(item.sku)}&cart=added`);
    } catch (e) {
      if (handleAuth(e)) return;
      setRowError({
        sku: item.sku,
        message: `${e instanceof ApiError ? e.message : "Something went wrong."} It stays in your wishlist.`,
      });
      setBusySku(null);
      router.refresh();
    }
  }

  async function remove() {
    if (!confirming) return;
    setRemoving(true);
    try {
      const next = await api.wishlist.remove(confirming.sku);
      setItems(next.items);
      setAnnouncement(`Removed ${confirming.productName} from your wishlist.`);
      setConfirming(null);
      router.refresh();
    } catch (e) {
      if (handleAuth(e)) return;
      setRowError({ sku: confirming.sku, message: e instanceof ApiError ? e.message : "Couldn’t remove. Try again." });
      setConfirming(null);
    } finally {
      setRemoving(false);
    }
  }

  const inStock = items.filter((i) => i.purchasable && i.available > 0);
  const unavailable = items.filter((i) => !(i.purchasable && i.available > 0));

  const removeButton = (item: WishlistItem, label: string) => (
    <button
      type="button"
      className="self-start text-sm underline"
      disabled={!hydrated}
      aria-label={`${label}: ${item.productName}`}
      onClick={() => {
        setRowError(null);
        setConfirming(item);
      }}
    >
      {label}
    </button>
  );

  const error = (item: WishlistItem) =>
    rowError?.sku === item.sku ? (
      <p role="alert" className="text-sm text-danger">
        {rowError.message}
      </p>
    ) : null;

  return (
    <>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        Saved Bibles
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {items.length === 0 ? (
        <EmptyWishlist />
      ) : (
        <>
          <p className="text-base">{plural(items.length, "saved Bible", "saved Bibles")} · Availability is checked before cart transfer.</p>
          {inStock.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inStock.map((item) => (
                <li key={item.sku} className="flex flex-col gap-2.5 border border-line p-3">
                  <BookCover label={item.productName} />
                  <div className="text-sm">
                    <h3 className="text-base font-semibold">
                      <Link href={`/products/${item.productSlug}?variant=${encodeURIComponent(item.sku)}`}>{item.productName}</Link>
                    </h3>
                    <p>{item.variantLabel}</p>
                    <p>
                      {item.sku} · {item.available} available
                    </p>
                    <p className="text-base font-semibold">{formatCents(item.priceCents)}</p>
                  </div>
                  <button
                    type="button"
                    className={`${secondaryButton} self-start`}
                    disabled={!hydrated || busySku !== null}
                    aria-label={`Move to cart: ${item.productName}`}
                    onClick={() => void move(item)}
                  >
                    {busySku === item.sku ? "Moving…" : "Move to cart"}
                  </button>
                  {removeButton(item, "Remove from wishlist")}
                  {error(item)}
                </li>
              ))}
            </ul>
          ) : null}
          {unavailable.map((item) => (
            <section key={item.sku} aria-labelledby={`oos-${item.sku}`} className={panel}>
              <h3 id={`oos-${item.sku}`} className="text-base font-semibold">
                Out-of-stock wishlist item
              </h3>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 flex-col gap-2 text-sm">
                  <p className="text-base font-semibold">
                    {item.productName} · {formatCents(item.priceCents)}
                  </p>
                  <p>
                    {item.sku} · {item.binding} · {item.purchasable ? "Out of stock" : "No longer available"}
                    <br />
                    Move to cart disabled. Keep saved or remove.
                  </p>
                </div>
                <p className="flex flex-1 flex-wrap items-start gap-2 text-sm">
                  <Link href={`/categories/${item.categorySlug ?? "bibles"}`} className="underline" aria-label={`Find alternatives to ${item.productName}`}>
                    Find alternatives
                  </Link>
                  <span aria-hidden="true">·</span>
                  {removeButton(item, "Remove")}
                </p>
              </div>
              {error(item)}
            </section>
          ))}
        </>
      )}
      <ConfirmDialog
        open={confirming !== null}
        title="Remove item confirmation"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        busy={removing}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!removing) setConfirming(null);
        }}
        fallbackFocusRef={headingRef}
      >
        Remove {confirming?.productName} from wishlist?
      </ConfirmDialog>
    </>
  );
}
