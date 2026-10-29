"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api/client";
import { signInRedirect } from "@/lib/auth-redirect";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * A11 "Reorder (stock check)": puts the lines back in the cart and opens
 * O01, where any change in price or stock shows as E06. Never charges.
 */
export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const returnTo = `/account/orders/${encodeURIComponent(orderId)}`;

  async function reorder() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.account.reorder(orderId);
      if (result.added.length === 0) {
        setMessage("None of these items can be bought right now, so nothing was added to your cart.");
        setBusy(false);
        return;
      }
      router.push("/cart");
      router.refresh();
    } catch (e) {
      const redirect = signInRedirect(e, returnTo);
      if (redirect) {
        router.push(redirect);
        return;
      }
      setMessage(e instanceof ApiError ? e.message : "Couldn’t reorder. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="underline" disabled={!hydrated || busy} onClick={() => void reorder()}>
        {busy ? "Adding to cart…" : "Reorder (stock check)"}
      </button>
      {message ? (
        <p role="alert" className="basis-full text-sm text-danger">
          {message}
        </p>
      ) : null}
    </>
  );
}
