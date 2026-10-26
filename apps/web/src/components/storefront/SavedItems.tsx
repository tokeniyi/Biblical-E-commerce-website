"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatCents, type SavedItemView } from "@your-app/shared";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError, api } from "@/lib/api/client";
import { stockLabel } from "./ProductCard";

/**
 * C08 saved items table. Move to cart rechecks stock and price on the
 * server; if that fails the item stays saved and the reason is shown (E05).
 * Remove asks first and never touches the cart.
 */
export function SavedItems({ items }: { items: SavedItemView[] }) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ sku: string; message: string } | null>(null);
  const [confirming, setConfirming] = useState<SavedItemView | null>(null);
  const [removing, setRemoving] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  async function move(item: SavedItemView) {
    setBusySku(item.sku);
    setRowError(null);
    try {
      await api.cart.moveSavedToCart(item.sku);
      // → C07: the drawer on the product page confirms the server-side move.
      router.push(`/products/${item.productSlug}?variant=${encodeURIComponent(item.sku)}&cart=added`);
    } catch (e) {
      const message =
        e instanceof ApiError && e.code === "out_of_stock"
          ? `${item.productName} is out of stock, so it stays in your saved items.`
          : e instanceof ApiError
            ? `${e.message} It stays in your saved items.`
            : "Something went wrong. It stays in your saved items.";
      setRowError({ sku: item.sku, message });
      // Show the stock the server just checked.
      router.refresh();
      setBusySku(null);
    }
  }

  async function confirmRemove() {
    if (!confirming) return;
    setRemoving(true);
    try {
      await api.cart.removeSaved(confirming.sku);
      setAnnouncement(`Removed ${confirming.productName} from saved items.`);
      setConfirming(null);
      router.refresh();
    } catch (e) {
      setRowError({ sku: confirming.sku, message: e instanceof ApiError ? e.message : "Couldn’t remove. Try again." });
      setConfirming(null);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        Saved items
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {items.length === 0 ? (
        <p className="text-base">You have no saved items.</p>
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[640px] text-left font-mono text-[13px] leading-snug">
            <thead className="bg-band">
              <tr>
                <th scope="col" className="p-3 font-semibold">Saved Bible</th>
                <th scope="col" className="p-3 font-semibold">Variant / SKU</th>
                <th scope="col" className="p-3 font-semibold">Price &amp; stock</th>
                <th scope="col" className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.sku} className="border-t border-band align-top">
                  <th scope="row" className="p-3 font-normal">
                    {item.productName}
                  </th>
                  <td className="p-3">
                    {item.binding} · {item.sku}
                  </td>
                  <td className="p-3">
                    {formatCents(item.priceCents)} · {stockLabel(item.available)}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-x-1">
                      {item.available > 0 ? (
                        <button
                          type="button"
                          className="underline"
                          aria-disabled={busySku === item.sku || undefined}
                          aria-label={`Move to cart: ${item.productName}`}
                          onClick={() => {
                            if (busySku === null) void move(item);
                          }}
                        >
                          {busySku === item.sku ? "Moving…" : "Move to cart"}
                        </button>
                      ) : (
                        <Link
                          href={`/categories/${item.categorySlug ?? "bibles"}`}
                          className="underline"
                          aria-label={`View alternatives to ${item.productName}`}
                        >
                          View alternatives
                        </Link>
                      )}
                      <span aria-hidden="true">/</span>
                      <button
                        type="button"
                        className="underline"
                        aria-label={`Remove: ${item.productName}`}
                        onClick={() => {
                          setRowError(null);
                          setConfirming(item);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    {rowError?.sku === item.sku ? (
                      <p role="alert" className="mt-2 font-sans text-sm text-danger">
                        {rowError.message}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title="Remove saved item"
        confirmLabel="Remove"
        cancelLabel="Keep item"
        busy={removing}
        onConfirm={() => void confirmRemove()}
        onCancel={() => {
          if (!removing) setConfirming(null);
        }}
        fallbackFocusRef={headingRef}
      >
        Remove {confirming?.productName} from saved items? This does not affect items already in your cart.
      </ConfirmDialog>
    </>
  );
}
