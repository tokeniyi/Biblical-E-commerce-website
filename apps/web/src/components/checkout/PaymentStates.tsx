import Link from "next/link";
import type { ReactNode } from "react";
import { panel, primaryButton, textLink } from "@/components/ui/styles";

/** E15 known branch: a verified decline. Never shown alongside the uncertain branch. */
export function PaymentDeclined() {
  return (
    <section aria-labelledby="known-decline-title" className={panel}>
      <h2 id="known-decline-title" className="text-base font-semibold">
        Known decline
      </h2>
      <p className="text-sm">Payment declined. No paid confirmation.</p>
      <Link href="/checkout/payment" className={`${primaryButton} self-start`}>
        Change method
      </Link>
    </section>
  );
}

type UncertainProps = {
  onCheck?: () => void;
  busy?: boolean;
  /** Shown after a check that still couldn't confirm the outcome. */
  stillPending?: boolean;
  children?: ReactNode;
};

/**
 * E15 uncertain branch: we don't know whether payment completed. "Check
 * status" looks up the existing intent; it never starts a new payment.
 */
export function PaymentUncertain({ onCheck, busy = false, stillPending = false, children }: UncertainProps) {
  return (
    <section aria-labelledby="uncertain-title" role="alert" className={`${panel} border-2 border-ink`}>
      <h2 id="uncertain-title" className="text-base font-semibold">
        Network uncertain
      </h2>
      <p className="text-sm">We’re checking whether payment completed. Don’t pay again yet.</p>
      <button type="button" className={`${primaryButton} self-start`} disabled={busy || !onCheck} onClick={onCheck}>
        {busy ? "Checking…" : "Check status"}
      </button>
      {stillPending ? (
        <p className="text-sm">
          Payment is still pending.{" "}
          <Link href="/help/shipping-returns" className={textLink}>
            Contact help
          </Link>{" "}
          if this continues.
        </p>
      ) : null}
      {children}
    </section>
  );
}
