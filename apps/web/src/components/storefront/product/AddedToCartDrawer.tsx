"use client";

import Link from "next/link";
import { useId, useRef, type RefObject } from "react";
import { formatCents, type CartView } from "@your-app/shared";
import { Dialog } from "@/components/ui/Dialog";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, secondaryButton, textLink } from "@/components/ui/styles";
import { BookCover } from "../BookCover";

export type DrawerState = { cart: CartView; sku: string; quantity: number };

type Props = {
  state: DrawerState | null;
  translation: string;
  onClose: () => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

/**
 * C07 Added to cart. A modal drawer over the product page, shown only after
 * the server confirmed the cart update. Focus starts on Close, is trapped
 * while open, and returns to Add to cart on close.
 */
export function AddedToCartDrawer({ state, translation, onClose, fallbackFocusRef }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const line = state?.cart.lines.find((l) => l.sku === state.sku);
  const others = state?.cart.lines.filter((l) => l.sku !== state.sku) ?? [];

  return (
    <Dialog
      open={state !== null && line !== undefined}
      onClose={onClose}
      labelledBy={titleId}
      initialFocusRef={closeRef}
      fallbackFocusRef={fallbackFocusRef}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(450px,100vw)] overflow-y-auto border-l border-ink bg-white p-4 backdrop:bg-black/40"
    >
      {state && line ? (
        <div data-screen="C07" className="flex flex-col gap-4">
          <div className={panel}>
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-base font-semibold">
                ✓ Added to your cart
              </h2>
              <button ref={closeRef} type="button" className="text-base font-semibold" onClick={onClose}>
                Close ×
              </button>
            </div>
            <div className="flex gap-4">
              <div className="w-[100px] shrink-0">
                <BookCover label={translation} heightClass="h-[134px]" />
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-base font-semibold">{line.productName}</p>
                <div className="text-sm leading-snug">
                  <p>{line.variantLabel}</p>
                  <p>SKU {line.sku}</p>
                  <p>
                    Quantity {state.quantity} · {formatCents(line.unitPriceCents * state.quantity)}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-base">
              Cart: {state.cart.itemCount} {state.cart.itemCount === 1 ? "item" : "items"} · Subtotal{" "}
              {formatCents(state.cart.subtotalCents)}
            </p>
            {others.length > 0 ? (
              <p className="text-sm">
                Also in cart:{" "}
                {others.map((o, i) => (
                  <span key={o.sku}>
                    {i > 0 ? "; " : ""}
                    {o.productName} × {o.quantity} · {formatCents(o.lineTotalCents)}
                  </span>
                ))}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/cart" className={primaryButton}>
                View cart
              </Link>
              <button type="button" className={textLink} onClick={onClose}>
                Continue shopping
              </button>
            </div>
            <Link href="/checkout/identity" className={`${secondaryButton} self-start`}>
              Checkout
            </Link>
          </div>
          <StatusMessage title="No account required">
            You can complete checkout as a guest. Sign in later without losing the cart.
          </StatusMessage>
        </div>
      ) : null}
    </Dialog>
  );
}
