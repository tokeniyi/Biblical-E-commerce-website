import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { formatCents, variantShortLabel, type Variant } from "@your-app/shared";
import { fieldBox, fieldLabel, primaryButton, textLink } from "@/components/ui/styles";

type SoldOutProps = {
  variant: Pick<Variant, "binding" | "sku">;
  alternativesHref: string;
  /** The ♡ control ("Save to wishlist → A12 / A01"). */
  wishlist: ReactNode;
  addRef?: Ref<HTMLButtonElement>;
};

/** E05 Product sold out: add disabled (the server still checks), alternatives and wishlist offered. */
export function SoldOutNotice({ variant, alternativesHref, wishlist, addRef }: SoldOutProps) {
  return (
    <section data-state="E05" aria-label="Out of stock" className="flex flex-col gap-3.5">
      <p className="text-base">
        Out of stock · {variant.binding} · SKU {variant.sku}
      </p>
      <div className={fieldBox}>
        <p className={fieldLabel}>Add to cart</p>
        <button ref={addRef} type="button" disabled className={`${primaryButton} self-start`}>
          Add to cart
        </button>
        <p>Disabled — out of stock</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={alternativesHref} className={primaryButton}>
          Find alternatives
        </Link>
        {wishlist}
      </div>
    </section>
  );
}

type UnavailableProps = {
  selection: Pick<Variant, "binding" | "printSize">;
  alternative: Pick<Variant, "binding" | "printSize" | "priceCents" | "stock"> | undefined;
  /** "Select available variant": a button on C05, a link in the gallery. */
  selectAlternative: ReactNode;
  alternativesHref: string;
  addRef?: Ref<HTMLButtonElement>;
};

/** E12 Variant unavailable: the selection stays visible, can't be bought, and a valid variant is offered. */
export function VariantUnavailableNotice({ selection, alternative, selectAlternative, alternativesHref, addRef }: UnavailableProps) {
  const largePrint = selection.printSize === "Large print";
  return (
    <section data-state="E12" aria-label="Variant unavailable" className="flex flex-col gap-3.5">
      <div className={fieldBox}>
        <p className={fieldLabel}>Binding / print selection</p>
        <p>{variantShortLabel(selection)} — unavailable</p>
      </div>
      <p role="status" className="text-base">
        The selected combination is not available to purchase.
        {alternative && alternative.stock.available > 0
          ? ` ${variantShortLabel(alternative)} is in stock: ${String(alternative.stock.available)} · ${formatCents(alternative.priceCents)}.`
          : ""}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button ref={addRef} type="button" disabled className={primaryButton}>
          Add to cart
        </button>
        {selectAlternative}
        <Link href={largePrint ? "/categories/large-print" : alternativesHref} className={textLink}>
          {largePrint ? "Browse large print" : "Find alternatives"}
        </Link>
      </div>
    </section>
  );
}
