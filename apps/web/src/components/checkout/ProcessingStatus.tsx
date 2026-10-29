"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatCents, type PaymentIntentView } from "@your-app/shared";
import { fieldBox, fieldLabel, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { PaymentUncertain } from "./PaymentStates";

type State = "checking" | "uncertain" | "missing";

/**
 * O06: submission is locked and nothing claims success until the server
 * says so. Paid → O08, declined → O07, unknown → E15 "Check status", which
 * looks up the same intent (never a second one).
 */
export function ProcessingStatus({ intentId, amountCents }: { intentId: string; amountCents: number }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  const route = useCallback(
    (intent: PaymentIntentView, afterCheck: boolean) => {
      if (intent.status === "paid" && intent.orderId) {
        router.replace(`/orders/${encodeURIComponent(intent.orderId)}/confirmation`);
        router.refresh();
      } else if (intent.status === "declined") {
        router.replace(`/checkout/payment?status=failed&intent=${encodeURIComponent(intent.id)}`);
      } else {
        setState("uncertain");
        if (afterCheck) setStillPending(true);
      }
    },
    [router],
  );

  const fail = useCallback((e: unknown) => {
    setState(e instanceof ApiError && e.code === "not_found" ? "missing" : "uncertain");
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.checkout
      .getIntent(intentId)
      .then((intent) => {
        if (!cancelled) route(intent, false);
      })
      .catch((e: unknown) => {
        if (!cancelled) fail(e);
      });
    return () => {
      cancelled = true;
    };
  }, [intentId, route, fail]);

  async function check() {
    setBusy(true);
    try {
      route(await api.checkout.checkIntent(intentId), true);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  if (state === "missing") {
    return (
      <div role="alert" className="flex flex-col gap-2 text-base">
        <p>We couldn’t find that payment.</p>
        <Link href="/cart" className={textLink}>
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 border border-line bg-white p-4" aria-busy={state === "checking"}>
        <p className="text-base font-semibold">
          <span aria-hidden="true">[ … ] </span>Payment in progress
        </p>
        <p role="status" className="text-2xl font-semibold">
          Please wait while we check your payment.
        </p>
        <p className="text-base">
          Your order is not confirmed yet. Do not submit again or close this page while payment is being checked.
        </p>
        <div className={fieldBox}>
          <p className={fieldLabel}>Payment action disabled</p>
          <button type="button" disabled className="self-start border border-line bg-band px-4 py-2.5 text-sm font-semibold text-muted">
            Pay {formatCents(amountCents)} — processing
          </button>
        </div>
        <p className="text-sm">No success reference is shown until the server confirms the paid order.</p>
      </div>
      {state === "uncertain" ? <PaymentUncertain onCheck={() => void check()} busy={busy} stillPending={stillPending} /> : null}
    </>
  );
}
