"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatCents, type CheckoutView, type ShippingMethodId } from "@your-app/shared";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * O04: rates come from the server for the verified address. Choosing a
 * method saves it and recalculates the total before payment.
 */
export function ShippingMethodForm({ view }: { view: CheckoutView }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const current = view.quote.shippingMethod ?? "standard";
  const [selected, setSelected] = useState<ShippingMethodId>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => { setSelected(current); }, [current]);

  async function choose(method: ShippingMethodId) {
    setSelected(method);
    setBusy(true);
    setError(null);
    try {
      const next = await api.checkout.chooseShipping(method);
      setAnnouncement(`Total updated: ${formatCents(next.quote.totalCents)}.`);
      router.refresh();
    } catch (e) {
      setSelected(current);
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const q = view.quote;
  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <fieldset className={panel} disabled={!hydrated || busy}>
        <legend className="float-left mb-3 w-full text-base font-semibold">Available methods</legend>
        {view.shippingOptions.map((o) => (
          <label key={o.id} className="flex flex-col gap-1.5 border border-line p-2.5 text-sm">
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="shipping-method"
                value={o.id}
                checked={selected === o.id}
                disabled={!o.available}
                onChange={() => void choose(o.id)}
              />
              <span>
                {o.label} · {formatCents(o.priceCents)} · Estimated {o.estimate}
              </span>
            </span>
            {!o.available && o.reason ? <span className="text-muted">Unavailable: {o.reason}</span> : null}
            {o.available && selected !== o.id ? (
              <span className="text-muted">
                If chosen: subtotal {formatCents(q.subtotalCents)}
                {q.discountCents < 0 ? ` − discount ${formatCents(-q.discountCents)}` : ""} + shipping {formatCents(o.priceCents)} + tax{" "}
                {formatCents(q.taxCents)} = {formatCents(o.totalIfChosenCents)}
              </span>
            ) : null}
          </label>
        ))}
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/checkout/payment" className={primaryButton} aria-disabled={busy || undefined}>
          Continue to payment
        </Link>
        <Link href="/checkout/delivery" className={textLink}>
          Edit address
        </Link>
      </div>
      <p className="text-sm text-muted">Dates are estimates.</p>
    </>
  );
}
