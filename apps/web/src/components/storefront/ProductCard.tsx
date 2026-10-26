import Link from "next/link";
import { formatCents, variantLongLabel, type ListingItem } from "@your-app/shared";
import type { Viewer } from "@/lib/api/viewer";
import { secondaryButton } from "@/components/ui/styles";
import { BookCover } from "./BookCover";
import { WishlistButton } from "./WishlistButton";

export function stockLabel(available: number): string {
  return available > 0 ? `${String(available)} available` : "Out of stock";
}

/** Product card from C01/C03/C04: shows the variant that matched the filters. */
export function ProductCard({ item, viewer }: { item: ListingItem; viewer: Viewer }) {
  const { variant } = item;
  const href = `/products/${item.slug}?variant=${encodeURIComponent(variant.sku)}`;
  return (
    <article data-testid="product-card" className="flex min-w-0 flex-col gap-2.5 border border-line p-3">
      <BookCover label={item.name} />
      <div className="text-sm leading-normal">
        <h3 className="text-base font-semibold">{item.name}</h3>
        <p>{variantLongLabel(variant)}</p>
        <p>
          {variant.sku} · {stockLabel(variant.stock.available)}
        </p>
        <p className="text-base font-semibold">{formatCents(variant.priceCents)}</p>
      </div>
      <Link href={href} className={`${secondaryButton} self-start`} aria-label={`View Bible: ${item.name}`}>
        View Bible
      </Link>
      <WishlistButton
        sku={variant.sku}
        productName={item.name}
        signedIn={viewer.kind === "customer"}
        saved={viewer.kind === "customer" && viewer.wishlist.includes(variant.sku)}
      />
    </article>
  );
}

export function ProductGrid({ children, busy = false }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <div aria-busy={busy || undefined} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
