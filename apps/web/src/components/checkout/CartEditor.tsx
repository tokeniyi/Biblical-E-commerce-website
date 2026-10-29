"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { TAX_RATE_BPS, formatCents, type CartLineView, type CheckoutView, type MergeConflict } from "@your-app/shared";
import { firstErrors } from "@/components/forms/AddressForm";
import { Dialog } from "@/components/ui/Dialog";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { fieldBox, fieldLabel, panel, primaryButton, secondaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";
import { CartChanges } from "./CartChanges";
import { EmptyCart } from "./EdgeStates";
import { MergeConflicts } from "./MergeConflicts";
import { OrderSummary } from "./OrderSummary";

const stepButton = "inline-flex h-8 w-8 items-center justify-center border border-ink bg-white disabled:border-line disabled:text-muted";

function itemsLabel(n: number): string {
  return `${String(n)} ${n === 1 ? "item" : "items"}`;
}

/**
 * O01 Your cart. Every change goes to the server, which answers with the
 * whole checkout view, so totals are never computed in the browser.
 */
export function CartEditor({ initial }: { initial: CheckoutView }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [view, setView] = useState(initial);
  // A refresh (or E06 accept) brings a newer server view.
  useEffect(() => { setView(initial); }, [initial]);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ sku: string; message: string } | null>(null);
  const [confirming, setConfirming] = useState<CartLineView | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();

  const [code, setCode] = useState(initial.quote.promoCode ?? "");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const promoRef = useRef<HTMLInputElement>(null);

  const { cart, quote, changes, reconciledQuote } = view;
  const blocked = changes.length > 0;

  function applyView(next: CheckoutView, message: string) {
    setView(next);
    setAnnouncement(`${message} Cart: ${itemsLabel(next.cart.itemCount)}.`);
    // The header's "Cart (n)" is a Server Component.
    router.refresh();
  }

  async function mutateLine(line: CartLineView, action: () => Promise<CheckoutView>, message: string) {
    setBusySku(line.sku);
    setRowError(null);
    try {
      applyView(await action(), message);
    } catch (e) {
      setRowError({ sku: line.sku, message: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
    } finally {
      setBusySku(null);
    }
  }

  async function remove() {
    const line = confirming;
    if (!line) return;
    setConfirming(null);
    await mutateLine(line, () => api.cart.removeLine(line.sku), `Removed ${line.productName}.`);
    headingRef.current?.focus();
  }

  async function saveForLater(line: CartLineView) {
    setConfirming(null);
    setBusySku(line.sku);
    try {
      await api.cart.saveForLater(line.sku);
      router.push("/cart/saved");
      router.refresh();
    } catch (e) {
      setRowError({ sku: line.sku, message: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
      setBusySku(null);
    }
  }

  async function resolveMerge(conflict: MergeConflict, use: "kept" | "account") {
    setBusySku(conflict.sku);
    setRowError(null);
    const quantity = use === "kept" ? conflict.keptQuantity : conflict.accountQuantity;
    try {
      applyView(await api.cart.resolveMerge({ sku: conflict.sku, use }), `${conflict.productName}: quantity ${String(quantity)}.`);
    } catch (e) {
      setRowError({ sku: conflict.sku, message: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
    } finally {
      setBusySku(null);
    }
  }

  async function applyPromo() {
    setPromoBusy(true);
    setPromoError(null);
    try {
      applyView(await api.cart.applyPromo(code), `Promo ${code.trim().toUpperCase()} applied.`);
    } catch (e) {
      // E08: keep the entered code; totals stay as they were.
      setPromoError(e instanceof ApiError ? (firstErrors(e.fieldErrors).code ?? e.message) : "Something went wrong. Try again.");
    } finally {
      setPromoBusy(false);
    }
  }

  async function removePromo() {
    setPromoError(null);
    setCode("");
    if (quote.promoCode) applyView(await api.cart.removePromo(), "Promo removed.");
    promoRef.current?.focus();
  }

  const taxable = quote.subtotalCents + quote.discountCents;

  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-semibold text-ink">
        Your cart
      </h1>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {cart.lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {blocked && reconciledQuote ? <CartChanges changes={changes} reconciled={reconciledQuote} /> : null}
            {cart.mergeConflicts.length > 0 ? (
              <MergeConflicts
                conflicts={cart.mergeConflicts}
                disabled={!hydrated || busySku !== null}
                onChoose={(conflict, use) => void resolveMerge(conflict, use)}
              />
            ) : null}

            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[640px] text-left font-mono text-[13px] leading-snug">
                <thead className="bg-band">
                  <tr>
                    <th scope="col" className="p-3 font-semibold">Bible / variant</th>
                    <th scope="col" className="p-3 font-semibold">Unit price</th>
                    <th scope="col" className="p-3 font-semibold">Quantity / limits</th>
                    <th scope="col" className="p-3 font-semibold">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.lines.map((line) => {
                    const busy = busySku === line.sku;
                    const max = Math.max(line.available, 1);
                    return (
                      <tr key={line.sku} className="border-t border-band align-top">
                        <th scope="row" className="p-3 font-normal">
                          <Link href={`/products/${line.productSlug}?variant=${encodeURIComponent(line.sku)}`} className="underline">
                            {line.productName}
                          </Link>
                          <div>
                            {line.sku} · {line.variantLabel.split(" / ")[0]}
                          </div>
                          <div className="mt-1 flex gap-1 font-sans text-sm">
                            <button
                              type="button"
                              className="underline"
                              aria-label={`Remove: ${line.productName}`}
                              disabled={!hydrated || busy}
                              onClick={() => { setConfirming(line); }}
                            >
                              Remove
                            </button>
                            <span aria-hidden="true">/</span>
                            <button
                              type="button"
                              className="underline"
                              aria-label={`Save for later: ${line.productName}`}
                              disabled={!hydrated || busy}
                              onClick={() => void saveForLater(line)}
                            >
                              Save
                            </button>
                          </div>
                        </th>
                        <td className="p-3">{formatCents(line.unitPriceCents)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1" role="group" aria-label={`Quantity: ${line.productName}`}>
                            <button
                              type="button"
                              className={stepButton}
                              aria-label={`Decrease quantity: ${line.productName}`}
                              disabled={!hydrated || busy || line.quantity <= 1}
                              onClick={() =>
                                void mutateLine(line, () => api.cart.setQuantity(line.sku, line.quantity - 1), `${line.productName} quantity ${String(line.quantity - 1)}.`)
                              }
                            >
                              −
                            </button>
                            <span className="min-w-6 text-center" data-testid="line-quantity">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              className={stepButton}
                              aria-label={`Increase quantity: ${line.productName}`}
                              disabled={!hydrated || busy || line.quantity >= line.available}
                              onClick={() =>
                                void mutateLine(line, () => api.cart.setQuantity(line.sku, line.quantity + 1), `${line.productName} quantity ${String(line.quantity + 1)}.`)
                              }
                            >
                              +
                            </button>
                          </div>
                          <p>
                            Min 1 · Max {max}
                          </p>
                          {rowError?.sku === line.sku ? (
                            <p role="alert" className="mt-1 font-sans text-sm text-danger">
                              {rowError.message}
                            </p>
                          ) : null}
                        </td>
                        <td className="p-3">{formatCents(line.lineTotalCents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="flex flex-wrap gap-2 text-sm">
              <Link href="/categories/bibles" className="underline">
                Continue shopping
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/cart/saved" className="underline">
                Saved for later ({cart.saved.length})
              </Link>
            </p>

            <form
              className={panel}
              aria-labelledby="promo-title"
              onSubmit={(e) => {
                e.preventDefault();
                void applyPromo();
              }}
            >
              <h2 id="promo-title" className="text-base font-semibold">
                Promo code
              </h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className={`${fieldBox} flex-1 ${promoError ? "border-2 border-danger" : ""}`}>
                  <label htmlFor="promo-code" className={fieldLabel}>
                    Code
                  </label>
                  <input
                    ref={promoRef}
                    id="promo-code"
                    name="code"
                    className="w-full border border-line p-1.5"
                    placeholder="Enter promo code"
                    autoComplete="off"
                    value={code}
                    aria-invalid={promoError ? true : undefined}
                    aria-describedby={promoError ? "promo-error" : undefined}
                    onChange={(e) => { setCode(e.target.value); }}
                  />
                  {promoError ? (
                    <p id="promo-error" role="alert" className="text-danger">
                      <span aria-hidden="true">! </span>
                      {promoError}
                    </p>
                  ) : null}
                </div>
                <button type="submit" className={primaryButton} disabled={!hydrated || promoBusy || code.trim() === ""}>
                  {promoBusy ? "Applying…" : "Apply"}
                </button>
              </div>
              {promoError ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => {
                      promoRef.current?.select();
                      promoRef.current?.focus();
                    }}
                  >
                    Try another code
                  </button>
                  <button type="button" className={textLink} onClick={() => void removePromo()}>
                    Remove code
                  </button>
                </div>
              ) : quote.promoCode ? (
                <p className="flex flex-wrap items-center gap-3 text-sm">
                  <span>Promo {quote.promoCode} applied.</span>
                  <button type="button" className={textLink} onClick={() => void removePromo()}>
                    Remove code
                  </button>
                </p>
              ) : (
                <p className="text-sm">No promo applied. Invalid or expired codes leave totals unchanged.</p>
              )}
            </form>
          </div>

          <aside className="flex w-full flex-col gap-4 md:w-[320px] md:shrink-0" aria-label="Checkout">
            <OrderSummary lines={cart.lines} totals={quote} />
            <StatusMessage title="Estimated totals">
              Tax sample: {TAX_RATE_BPS / 100}% of {formatCents(taxable)} = {formatCents(quote.taxCents)}. Shipping/tax recalculated
              after address. Proposed sample assumptions, not store policy.
            </StatusMessage>
            {blocked ? (
              <>
                <button type="button" className={`${primaryButton} self-start`} disabled aria-describedby="checkout-blocked">
                  Checkout
                </button>
                <p id="checkout-blocked" className="text-sm">
                  Review the changes above before checking out.
                </p>
              </>
            ) : (
              <Link href="/checkout/identity" className={`${primaryButton} self-start`}>
                Checkout
              </Link>
            )}
            <p className="text-sm">Secure checkout · Guest purchase available</p>
          </aside>
        </div>
      )}

      <Dialog
        open={confirming !== null}
        onClose={() => { setConfirming(null); }}
        labelledBy={dialogTitleId}
        initialFocusRef={keepRef}
        fallbackFocusRef={headingRef}
        className="m-auto w-[min(520px,calc(100vw-2rem))] border border-ink p-0 backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-3 p-4">
          <h2 id={dialogTitleId} className="text-base font-semibold">
            Remove item
          </h2>
          <p className="text-base">Remove {confirming?.productName}? You can save it for later instead.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-[3px] border border-danger bg-danger px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => void remove()}
            >
              Remove
            </button>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                if (confirming) void saveForLater(confirming);
              }}
            >
              Save for later
            </button>
            <button ref={keepRef} type="button" className={secondaryButton} onClick={() => { setConfirming(null); }}>
              Keep
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
