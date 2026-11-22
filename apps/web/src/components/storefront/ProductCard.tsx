import Link from "next/link";
import { formatCents, variantLongLabel, type ListingItem } from "@your-app/shared";
import type { Viewer } from "@/lib/api/viewer";
import { Stars } from "@/components/ui/Icon";
import { badge } from "@/components/ui/styles";
import { BookCover } from "./BookCover";
import { WishlistButton } from "./WishlistButton";

/** Low-stock threshold from the business rules (available ≤ 8). */
const LOW_STOCK = 8;

export function stockLabel(available: number): string {
  return available > 0 ? `${String(available)} available` : "Out of stock";
}

export function StockBadge({ available }: { available: number }) {
  if (available <= 0) return <span className={`${badge} bg-band text-muted`}>Sold out</span>;
  if (available <= LOW_STOCK) return <span className={`${badge} bg-gold-soft text-warning`}>Only {available} left</span>;
  return <span className={`${badge} bg-success/10 text-success`}>In stock</span>;
}

/** Product card for home, listing and search: shows the variant that matched the filters. */
export function ProductCard({ item, viewer }: { item: ListingItem; viewer: Viewer }) {
  const { variant } = item;
  const href = `/products/${item.slug}?variant=${encodeURIComponent(variant.sku)}`;
  return (
    <article
      data-testid="product-card"
      className="group relative flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="relative">
        <BookCover title={item.name} translation={variant.translation} binding={variant.binding} decorative />
        <div className="absolute left-2 top-2">
          <StockBadge available={variant.stock.available} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 text-sm leading-normal">
        <h3 className="font-display text-lg font-semibold leading-snug text-ink">
          <Link
            href={href}
            aria-label={`View Bible: ${item.name}`}
            data-track="product-card"
            className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:text-brand"
          >
            {item.name}
          </Link>
        </h3>
        <p className="text-muted">{variantLongLabel(variant)}</p>
        {item.rating ? (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Stars value={item.rating.average} className="h-3.5 w-3.5" />
            <span>
              {item.rating.average.toFixed(1)} ({item.rating.count})
            </span>
          </span>
        ) : null}
        <span className="text-xs text-muted">
          {variant.sku} · {stockLabel(variant.stock.available)}
        </span>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="text-lg font-semibold text-ink">{formatCents(variant.priceCents)}</p>
          <div className="relative z-10">
            <WishlistButton
              sku={variant.sku}
              productName={item.name}
              signedIn={viewer.kind === "customer"}
              saved={viewer.kind === "customer" && viewer.wishlist.includes(variant.sku)}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ children, busy = false }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <div aria-busy={busy || undefined} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
