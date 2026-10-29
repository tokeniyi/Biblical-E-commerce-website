import Link from "next/link";
import { primaryButton, textLink } from "@/components/ui/styles";

/** E03 Empty wishlist (A12): authenticated empty state. */
export function EmptyWishlist() {
  return (
    <div className="flex flex-col gap-3.5" data-state="E03">
      <h2 className="text-2xl font-semibold">No saved Bibles yet</h2>
      <p className="text-base">Use the heart action on a product to save it for later.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/categories/bibles" className={primaryButton}>
          Discover Bibles
        </Link>
        <Link href="/account" className={textLink}>
          Account overview
        </Link>
      </div>
    </div>
  );
}

/** E04 No orders yet (A10): guest purchases are not implied to appear on their own. */
export function NoOrders() {
  return (
    <div className="flex flex-col gap-3.5" data-state="E04">
      <h2 className="text-2xl font-semibold">You haven’t placed an account order</h2>
      <p className="text-base">Browse the store, or securely find an order placed as a guest.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className={primaryButton}>
          Shop Bibles
        </Link>
        <Link href="/orders/lookup" className={textLink}>
          Find guest order
        </Link>
      </div>
    </div>
  );
}
