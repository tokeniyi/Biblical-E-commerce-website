"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  SHIPPING_METHODS,
  RETURN_WINDOW_DAYS,
  formatCents,
  shortPrintSize,
  type CartView,
  type CategoryRef,
  type Product,
  type Variant,
} from "@your-app/shared";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { fieldBox, fieldLabel, panel, primaryButton } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { BookCover } from "../BookCover";
import { WishlistButton } from "../WishlistButton";
import { AddedToCartDrawer, type DrawerState } from "./AddedToCartDrawer";
import { SoldOutNotice, VariantUnavailableNotice } from "./VariantNotices";

type Selection = Pick<Variant, "translation" | "binding" | "printSize">;
type Dimension = keyof Selection;

const LANGUAGE_NAMES: Record<string, string> = { en: "English", es: "Spanish" };

type Props = {
  product: Product;
  category: CategoryRef | null;
  initialSku: string | null;
  /** The cart as the server last saw it, for a directly opened C07 URL. */
  cart: CartView;
  drawerOpen: boolean;
  signedIn: boolean;
  wishlist: string[];
  description: ReactNode;
  reviews: ReactNode;
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function pickInitial(variants: Variant[], sku: string | null): Variant | undefined {
  const published = variants.filter((v) => v.status === "published");
  return (
    variants.find((v) => v.sku === sku) ??
    published.find((v) => v.stock.available > 0) ??
    published.at(0) ??
    variants.at(0)
  );
}

function matches(v: Variant, s: Selection): boolean {
  return v.translation === s.translation && v.binding === s.binding && v.printSize === s.printSize;
}

/**
 * C05 Product & variant, with E05 (sold out) and E12 (variant unavailable)
 * inline and the C07 drawer. The selected variant drives SKU, price and
 * stock; the server re-validates everything on add.
 */
export function ProductPurchase({ product, category, initialSku, cart, drawerOpen, signedIn, wishlist, description, reviews }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const addRef = useRef<HTMLButtonElement>(null);
  const { variants } = product;

  const initial = pickInitial(variants, initialSku);
  const [selection, setSelection] = useState<Selection>(() => ({
    translation: initial?.translation ?? "",
    binding: initial?.binding ?? "",
    printSize: initial?.printSize ?? "",
  }));
  // When the URL picks another variant (Back/Forward), follow it.
  const [urlSku, setUrlSku] = useState(initialSku);
  if (initialSku !== urlSku) {
    setUrlSku(initialSku);
    const fromUrl = variants.find((v) => v.sku === initialSku);
    if (fromUrl && !matches(fromUrl, selection)) {
      setSelection({ translation: fromUrl.translation, binding: fromUrl.binding, printSize: fromUrl.printSize });
    }
  }
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [drawer, setDrawer] = useState<DrawerState | null>(() => {
    if (!drawerOpen || !initial) return null;
    const line = cart.lines.find((l) => l.sku === initial.sku);
    return line ? { cart, sku: line.sku, quantity: line.quantity } : null;
  });

  const current = variants.find((v) => matches(v, selection));
  const purchasable = current?.status === "published";
  const available = purchasable ? current.stock.available : 0;
  const state: "available" | "sold-out" | "unavailable" = !purchasable ? "unavailable" : available > 0 ? "available" : "sold-out";
  const published = variants.filter((v) => v.status === "published");
  const alternative = published.find((v) => v.stock.available > 0) ?? published.at(0);
  const shown = current ?? alternative;
  const categoryHref = `/categories/${category?.slug ?? "bibles"}`;

  function variantUrl(sku: string, added = false) {
    return `${pathname}?variant=${encodeURIComponent(sku)}${added ? "&cart=added" : ""}`;
  }

  function choose(next: Selection) {
    setSelection(next);
    setQuantity(1);
    setError("");
    const exact = variants.find((v) => matches(v, next));
    // Unavailable combinations stay selected and visible (E12) without changing the URL.
    if (exact) router.replace(variantUrl(exact.sku), { scroll: false });
  }

  function setDimension(dimension: Dimension, value: string) {
    choose({ ...selection, [dimension]: value });
  }

  function clamp(n: number) {
    return Math.max(1, Math.min(Number.isFinite(n) ? Math.trunc(n) : 1, Math.max(available, 1)));
  }

  async function addToCart() {
    if (!current || state !== "available" || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.cart.addLine({ sku: current.sku, quantity });
      setDrawer({ cart: res.cart, sku: res.added.sku, quantity: res.added.quantity });
      setAnnouncement(`Added ${product.name} to your cart.`);
      router.replace(variantUrl(current.sku, true), { scroll: false });
      // Re-render server chrome so the header shows the new cart count.
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function closeDrawer() {
    if (!drawer) return;
    setDrawer(null);
    if (current) router.replace(variantUrl(current.sku), { scroll: false });
  }

  const dimensions: { key: Dimension; label: string; options: string[]; display: (v: string) => string }[] = [
    { key: "translation", label: "Translation", options: unique(variants.map((v) => v.translation)), display: (v) => v },
    { key: "binding", label: "Binding", options: unique(variants.map((v) => v.binding)), display: (v) => v },
    { key: "printSize", label: "Print size", options: unique(variants.map((v) => v.printSize)), display: shortPrintSize },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex w-full flex-col gap-4 lg:w-[384px] lg:shrink-0">
          <BookCover label={`${product.name} / front cover`} heightClass="h-80" />
          <div className="grid grid-cols-3 gap-4">
            {["Back", "Pages", "Spine"].map((view) => (
              <BookCover key={view} label={view} heightClass="h-[88px]" />
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <p className="text-base">
            <Link href={`/products/${product.slug}/reviews`} className="hover:underline">
              {product.rating
                ? `${String(product.rating.average)} / 5 · ${String(product.rating.count)} verified reviews`
                : "No reviews yet"}
            </Link>
          </p>
          {state !== "unavailable" && current ? (
            <p className="text-[28px] font-semibold">{formatCents(current.priceCents)}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {dimensions.map((d) => (
              <div key={d.key} className={fieldBox}>
                <label htmlFor={`${id}-${d.key}`} className={fieldLabel}>
                  {d.label}
                </label>
                <select
                  id={`${id}-${d.key}`}
                  value={selection[d.key]}
                  onChange={(e) => {
                    setDimension(d.key, e.target.value);
                  }}
                  className="border border-line bg-white p-1"
                >
                  {d.options.map((o) => (
                    <option key={o} value={o}>
                      {d.display(o)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {state === "available" && current ? (
            <>
              <p className="text-sm">
                SKU {current.sku} · ISBN {current.isbn} · {available} available
              </p>
              <div className={fieldBox}>
                <label htmlFor={`${id}-qty`} className={fieldLabel}>
                  Quantity
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="border border-line px-2"
                    disabled={quantity <= 1}
                    onClick={() => {
                      setQuantity((q) => clamp(q - 1));
                    }}
                  >
                    −
                  </button>
                  <input
                    id={`${id}-qty`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={available}
                    value={quantity}
                    aria-describedby={`${id}-qty-hint`}
                    onChange={(e) => {
                      setQuantity(clamp(e.target.valueAsNumber));
                    }}
                    className="w-16 border border-line p-1 text-center"
                  />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="border border-line px-2"
                    disabled={quantity >= available}
                    onClick={() => {
                      setQuantity((q) => clamp(q + 1));
                    }}
                  >
                    +
                  </button>
                </div>
                <p id={`${id}-qty-hint`} className="text-muted">
                  Minimum 1 · maximum {available} for this variant
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Not `disabled` while busy: that would drop focus, and C07 must return focus here. */}
                <button
                  ref={addRef}
                  type="button"
                  className={primaryButton}
                  aria-disabled={busy || undefined}
                  onClick={() => void addToCart()}
                >
                  {busy ? "Adding…" : "Add to cart"}
                </button>
                <WishlistButton
                  sku={current.sku}
                  productName={product.name}
                  signedIn={signedIn}
                  saved={wishlist.includes(current.sku)}
                  label="♡ Wishlist"
                />
              </div>
            </>
          ) : null}

          {state === "sold-out" && current ? (
            <SoldOutNotice
              variant={current}
              alternativesHref={categoryHref}
              addRef={addRef}
              wishlist={
                <WishlistButton
                  sku={current.sku}
                  productName={product.name}
                  signedIn={signedIn}
                  saved={wishlist.includes(current.sku)}
                  label="Save to wishlist"
                />
              }
            />
          ) : null}

          {state === "unavailable" ? (
            <VariantUnavailableNotice
              selection={selection}
              alternative={alternative}
              alternativesHref={categoryHref}
              addRef={addRef}
              selectAlternative={
                alternative ? (
                  <button
                    type="button"
                    className={primaryButton}
                    onClick={() => {
                      choose({ translation: alternative.translation, binding: alternative.binding, printSize: alternative.printSize });
                    }}
                  >
                    Select available variant
                  </button>
                ) : null
              }
            />
          ) : null}

          {error ? (
            <p role="alert" className="border border-danger p-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <p role="status" className="sr-only">
            {announcement}
          </p>

          <StatusMessage title="Shipping & returns">
            Standard shipping {formatCents(SHIPPING_METHODS.standard.priceCents)} · estimate after address. Proposed:
            unopened items may be returned within {RETURN_WINDOW_DAYS} days of delivery.{" "}
            <Link href="/help/shipping-returns" className="underline">
              See shipping &amp; returns
            </Link>{" "}
            for eligibility.
          </StatusMessage>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {description}
        <section aria-labelledby={`${id}-specs`} className={panel}>
          <h2 id={`${id}-specs`} className="text-base font-semibold">
            Specifications
          </h2>
          {shown ? (
            <ul className="text-sm leading-snug">
              <li>
                Translation: {shown.translation} · {LANGUAGE_NAMES[product.language] ?? product.language}
              </li>
              <li>
                Binding: {shown.binding}
                {shown.fontSizePt
                  ? ` · Print: ${String(shown.fontSizePt)} pt ${shortPrintSize(shown.printSize).toLowerCase().replace(" print", "")}`
                  : ""}
              </li>
              {product.specs.pages || product.specs.trimSize ? (
                <li>
                  {[
                    product.specs.pages ? `Pages: ${product.specs.pages.toLocaleString("en-US")}` : null,
                    product.specs.trimSize ? `Size: ${product.specs.trimSize}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </li>
              ) : null}
              {product.specs.publisher ? <li>Publisher: {product.specs.publisher}</li> : null}
            </ul>
          ) : null}
        </section>
        {reviews}
      </div>

      <AddedToCartDrawer
        state={drawer}
        translation={current?.translation ?? product.name}
        onClose={closeDrawer}
        fallbackFocusRef={addRef}
      />
    </>
  );
}
