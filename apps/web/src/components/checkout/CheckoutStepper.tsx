import Link from "next/link";
import { StatusMessage } from "@/components/ui/StatusMessage";

const STEPS = [
  { id: "identity", label: "Identity", href: "/checkout/identity" },
  { id: "delivery", label: "Delivery", href: "/checkout/delivery" },
  { id: "method", label: "Method", href: "/checkout/shipping" },
  { id: "payment", label: "Payment", href: "/checkout/payment" },
  { id: "confirmation", label: "Confirmation", href: null },
] as const;

export type CheckoutStep = (typeof STEPS)[number]["id"];

type CheckoutStepperProps = {
  current: CheckoutStep;
  /** The Figma status line, e.g. "Checkout / 1 / Identity". */
  title: string;
  /** Earlier steps link back for edits before purchase; off while payment is in flight. */
  linkPrevious?: boolean;
};

/** CheckoutStepper (spec §4): the "Identity → Delivery → Method → Payment → Confirmation" line. */
export function CheckoutStepper({ current, title, linkPrevious = true }: CheckoutStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <StatusMessage title={title}>
      <nav aria-label="Checkout steps">
        <ol className="flex flex-wrap gap-x-1">
          {STEPS.map((step, i) => (
            <li key={step.id} className="flex gap-1">
              {i > 0 ? <span aria-hidden="true">→</span> : null}
              {i < currentIndex && linkPrevious && step.href ? (
                <Link href={step.href} className="underline">
                  {step.label}
                </Link>
              ) : (
                <span aria-current={i === currentIndex ? "step" : undefined} className={i === currentIndex ? "font-semibold" : undefined}>
                  {step.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </StatusMessage>
  );
}
