import Link from "next/link";
import type { ReactNode } from "react";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { fieldBox, fieldLabel, primaryButton, textLink } from "@/components/ui/styles";

/** E01: last item removed or first visit. Checkout is shown but unavailable. */
export function EmptyCart() {
  return (
    <section aria-labelledby="empty-cart-title" className="flex flex-col gap-3.5">
      <h2 id="empty-cart-title" className="text-2xl font-semibold">
        Your cart is empty
      </h2>
      <p className="text-base">Browse Bibles and choose an edition to get started.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/categories/bibles" className={primaryButton}>
          Browse Bibles
        </Link>
        <Link href="/cart/saved" className={textLink}>
          Saved items
        </Link>
      </div>
      <div className={fieldBox}>
        <p className={fieldLabel}>Checkout</p>
        <button type="button" className={`${primaryButton} self-start`} disabled aria-describedby="checkout-disabled-reason">
          Checkout
        </button>
        <p id="checkout-disabled-reason">Add an item first.</p>
      </div>
    </section>
  );
}

/**
 * E14: no delivery for this region. Payment stays blocked; the entered
 * address and the cart are kept.
 */
export function ShippingUnavailable({ address, editAddress }: { address?: ReactNode; editAddress?: ReactNode }) {
  return (
    <section aria-labelledby="shipping-unavailable-title" className="flex flex-col gap-3.5 border-2 border-ink bg-white p-5">
      <StatusMessage role="alert" title={<span id="shipping-unavailable-title">We can’t ship to this address</span>}>
        No delivery methods are available for the selected region. Your cart has not changed.
      </StatusMessage>
      {address}
      <div className="flex flex-wrap items-center gap-3">
        {editAddress ?? (
          <Link href="/checkout/delivery" className={primaryButton}>
            Edit address
          </Link>
        )}
        <Link href="/cart" className={textLink}>
          Back to cart
        </Link>
      </div>
    </section>
  );
}
