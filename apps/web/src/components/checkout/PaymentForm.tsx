"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatCents } from "@your-app/shared";
import {
  ADDRESS_FIELD_ORDER,
  ADDRESS_LABELS,
  AddressForm,
  EMPTY_ADDRESS,
  addressInput,
  firstErrors,
  summaryItems,
  type AddressValues,
} from "@/components/forms/AddressForm";
import { ErrorSummary, focusFirstInvalid } from "@/components/forms/ErrorSummary";
import { Field, controlProps, inputClass, type FieldErrors } from "@/components/forms/Field";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";
import { PaymentUncertain } from "./PaymentStates";

type Card = { cardNumber: string; expiry: string; cvc: string; cardName: string };
const EMPTY_CARD: Card = { cardNumber: "", expiry: "", cvc: "", cardName: "" };
const CARD_LABELS: Record<string, string> = {
  cardNumber: "Card number",
  expiry: "Expiry",
  cvc: "Security code",
  cardName: "Cardholder name",
  terms: "Terms",
};
const CARD_ORDER = ["cardNumber", "expiry", "cvc", "cardName", "terms"] as const;

/** Sessions keep one key per attempt, so retrying after an uncertain submit can't charge twice. */
const ATTEMPT_KEY = "checkout:payment-attempt";

/**
 * Hosted-field simulation: card values are checked here and never sent.
 * The "provider" returns only a token naming the brand and last four.
 */
export function validateCard(card: Card, today: Date): FieldErrors {
  const errors: FieldErrors = {};
  const digits = card.cardNumber.replace(/[\s-]/g, "");
  if (!digits) errors.cardNumber = "Enter a card number.";
  else if (!/^\d{13,19}$/.test(digits)) errors.cardNumber = "Enter a valid card number.";
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(card.expiry.trim());
  if (!card.expiry.trim()) errors.expiry = "Enter the expiry date.";
  else if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) errors.expiry = "Use MM / YY.";
  else {
    const end = new Date(Date.UTC(2000 + Number(m[2]), Number(m[1]), 1));
    if (end <= today) errors.expiry = "This card has expired.";
  }
  if (!card.cvc.trim()) errors.cvc = "Enter the security code.";
  else if (!/^\d{3,4}$/.test(card.cvc.trim())) errors.cvc = "Enter the 3 or 4 digit code.";
  if (!card.cardName.trim()) errors.cardName = "Enter the name on the card.";
  return errors;
}

export function simulatedToken(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  const brand = digits.startsWith("4") ? "visa" : digits.startsWith("5") ? "mastercard" : digits.startsWith("3") ? "amex" : "card";
  return `sim_${brand}_${digits.slice(-4)}`;
}

type PaymentFormProps = {
  totalCents: number;
  defaultName: string;
  /** E06 or E14 on the page: payment stays blocked. */
  blocked: boolean;
};

export function PaymentForm({ totalCents, defaultName, blocked }: PaymentFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const [card, setCard] = useState<Card>({ ...EMPTY_CARD, cardName: defaultName });
  const [sameAsDelivery, setSameAsDelivery] = useState(true);
  const [billing, setBilling] = useState<AddressValues>(EMPTY_ADDRESS);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [billingErrors, setBillingErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusErrors, setFocusErrors] = useState(0);

  useEffect(() => {
    if (focusErrors > 0) focusFirstInvalid(formRef.current);
  }, [focusErrors]);

  function attemptKey(): string {
    const existing = sessionStorage.getItem(ATTEMPT_KEY);
    if (existing) return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(ATTEMPT_KEY, key);
    return key;
  }

  async function pay() {
    const cardErrors = validateCard(card, new Date());
    if (!terms) cardErrors.terms = "Agree to the Terms to continue.";
    setErrors(cardErrors);
    setBillingErrors({});
    if (Object.keys(cardErrors).length > 0) {
      setFocusErrors((n) => n + 1);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const intent = await api.checkout.pay({
        idempotencyKey: attemptKey(),
        paymentToken: simulatedToken(card.cardNumber),
        billingSameAsDelivery: sameAsDelivery,
        billingAddress: sameAsDelivery ? null : addressInput(billing),
        termsAccepted: true,
        expectedTotalCents: totalCents,
      });
      sessionStorage.removeItem(ATTEMPT_KEY);
      router.push(`/checkout/processing?intent=${encodeURIComponent(intent.id)}`);
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === "network_error") {
        // We can't tell whether the intent was created: E15, never a blind retry.
        setUncertain(true);
      } else if (e instanceof ApiError && (e.code === "quote_changed" || e.code === "shipping_unavailable")) {
        sessionStorage.removeItem(ATTEMPT_KEY);
        router.refresh();
      } else if (e instanceof ApiError && e.code === "validation_failed" && e.fieldErrors) {
        setBillingErrors(firstErrors(e.fieldErrors, "billing."));
        setFocusErrors((n) => n + 1);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    }
  }

  const summary = [
    ...summaryItems(errors, { ...card, terms: terms ? "yes" : "" }, CARD_LABELS, "", CARD_ORDER).map((item) =>
      item.fieldId === "terms" ? { ...item, message: "Agree to the Terms to continue." } : item,
    ),
    ...summaryItems(billingErrors, billing, ADDRESS_LABELS, "billing-", ADDRESS_FIELD_ORDER).map((i) => ({
      ...i,
      message: `Billing ${i.message.charAt(0).toLowerCase()}${i.message.slice(1)}`,
    })),
  ];

  if (uncertain) {
    return <PaymentUncertain onCheck={() => void pay()} busy={busy} />;
  }

  const text = (key: keyof Card, label: string, autoComplete: string, placeholder?: string) => (
    <Field id={key} label={label} required error={errors[key]} className="flex-1">
      <input
        {...controlProps(key, errors[key])}
        className={inputClass}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        value={card[key]}
        onChange={(e) => { setCard({ ...card, [key]: e.target.value }); }}
      />
    </Field>
  );

  return (
    <form
      ref={formRef}
      noValidate
      aria-label="Payment"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!blocked && !busy) void pay();
      }}
    >
      <ErrorSummary items={summary} />

      <section aria-labelledby="billing-title" className={panel}>
        <h2 id="billing-title" className="text-base font-semibold">
          Billing address
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sameAsDelivery} onChange={(e) => { setSameAsDelivery(e.target.checked); }} />
          Same as delivery address
        </label>
        {sameAsDelivery ? (
          <p className="text-sm">Uncheck to show billing address fields.</p>
        ) : (
          <AddressForm idPrefix="billing-" values={billing} errors={billingErrors} onChange={setBilling} />
        )}
      </section>

      <fieldset className={panel}>
        <legend className="float-left mb-3 w-full text-base font-semibold">Payment method / hosted secure fields</legend>
        <div className="flex flex-wrap gap-x-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="payment-method" defaultChecked />
            Credit / debit card
          </label>
          <label className="flex items-center gap-2 text-muted">
            <input type="radio" name="payment-method" disabled aria-describedby="no-integration" />
            Alternative payment
          </label>
        </div>
        {text("cardNumber", "Card number", "cc-number")}
        <div className="flex flex-col gap-4 sm:flex-row">
          {text("expiry", "Expiry", "cc-exp", "MM / YY")}
          {text("cvc", "Security code", "cc-csc", "CVC")}
          {text("cardName", "Cardholder name", "cc-name")}
        </div>
        <p id="no-integration" className="text-sm">
          No real payment integration in this wireframe.
        </p>
      </fieldset>

      <div className="flex flex-col gap-1 text-sm">
        <label className={`flex items-center gap-2 ${errors.terms ? "text-danger" : ""}`}>
          <input
            {...controlProps("terms", errors.terms)}
            type="checkbox"
            checked={terms}
            onChange={(e) => { setTerms(e.target.checked); }}
          />
          I agree to the Terms and acknowledge the Privacy Policy.
        </label>
        {errors.terms ? (
          <p id="terms-error" className="text-danger">
            <span aria-hidden="true">! </span>
            {errors.terms}
          </p>
        ) : null}
        <p>Submitting requests a payment of {formatCents(totalCents)} USD.</p>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!hydrated || blocked || busy}>
          {busy ? "Submitting…" : `Pay ${formatCents(totalCents)}`}
        </button>
        <Link href="/checkout/shipping" className={textLink}>
          Back to delivery method
        </Link>
      </div>
    </form>
  );
}
