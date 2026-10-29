"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents, type CartChange, type Quote } from "@your-app/shared";
import { primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";

function cartCell(c: CartChange): string {
  return c.available !== null
    ? `Qty ${String(c.cartQuantity)} / ${formatCents(c.cartUnitPriceCents)} each`
    : formatCents(c.cartUnitPriceCents);
}

function serverCell(c: CartChange): string {
  const parts: string[] = [];
  if (c.available !== null) parts.push(c.available === 0 ? "None available" : `Only ${String(c.available)} available`);
  if (c.currentPriceCents !== null) parts.push(`${formatCents(c.currentPriceCents)} current price`);
  return parts.join(" · ");
}

export function afterAccepting(q: Omit<Quote, "lines">): string {
  const discount = q.discountCents < 0 ? ` − ${formatCents(-q.discountCents)} discount` : "";
  return `After accepting: ${formatCents(q.subtotalCents)}${discount} + ${formatCents(q.shippingCents)} shipping + ${formatCents(q.taxCents)} tax = ${formatCents(q.totalCents)}.`;
}

type CartChangesProps = {
  changes: readonly CartChange[];
  reconciled: Omit<Quote, "lines">;
  /** Interactive in the flow; the /__dev/states fixture renders it inert. */
  interactive?: boolean;
};

/**
 * E06: the server's stock or price differs from the cart. Payment stays
 * blocked until the customer accepts or removes the affected items; both
 * lead back to O01.
 */
export function CartChanges({ changes, reconciled, interactive = true }: CartChangesProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    if (!interactive || busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      router.push("/cart");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="cart-changes-title" className="flex flex-col gap-3 border-2 border-ink bg-white p-5">
      <h2 id="cart-changes-title" className="text-[22px] font-semibold">
        Review changes before paying
      </h2>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[520px] text-left font-mono text-[13px]">
          <thead className="bg-band">
            <tr>
              <th scope="col" className="p-3 font-semibold">Variant</th>
              <th scope="col" className="p-3 font-semibold">Cart</th>
              <th scope="col" className="p-3 font-semibold">Server change</th>
              {changes.length > 1 ? <th scope="col" className="p-3 font-semibold"><span className="sr-only">Actions</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.sku} className="border-t border-band">
                <th scope="row" className="p-3 font-normal">
                  <span className="sr-only">{c.productName} </span>
                  {c.sku}
                </th>
                <td className="p-3">{cartCell(c)}</td>
                <td className="p-3">{serverCell(c)}</td>
                {changes.length > 1 ? (
                  <td className="p-3">
                    <button
                      type="button"
                      className="font-sans underline"
                      aria-label={`Remove affected item: ${c.productName}`}
                      onClick={() => void run(() => api.cart.removeLine(c.sku))}
                    >
                      Remove
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">{afterAccepting(reconciled)}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={!hydrated || busy} onClick={() => void run(() => api.cart.acceptChanges())}>
          {busy ? "Updating…" : "Accept & update"}
        </button>
        {changes.length === 1 && changes[0] ? (
          <button
            type="button"
            className={textLink}
            disabled={!hydrated || busy}
            onClick={() => {
              const sku = changes[0]?.sku;
              if (sku) void run(() => api.cart.removeLine(sku));
            }}
          >
            Remove affected item
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
