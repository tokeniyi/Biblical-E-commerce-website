"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Address, CheckoutView } from "@your-app/shared";
import {
  ADDRESS_FIELD_ORDER,
  ADDRESS_LABELS,
  AddressForm,
  EMPTY_ADDRESS,
  addressInput,
  addressValues,
  firstErrors,
  summaryItems,
  type AddressValues,
} from "@/components/forms/AddressForm";
import { ErrorSummary, focusFirstInvalid } from "@/components/forms/ErrorSummary";
import { Field, controlProps, inputClass, type FieldErrors } from "@/components/forms/Field";
import { fieldBox, fieldLabel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";
import { ShippingUnavailable } from "./EdgeStates";

const FIELD_ORDER = ["fullName", "email", ...ADDRESS_FIELD_ORDER.slice(1)] as const;
const LABELS: Record<string, string> = { ...ADDRESS_LABELS, email: "Email" };
const NEW_ADDRESS = "new";

function savedLabel(a: Address): string {
  return `${a.isDefault ? "Default: " : ""}${a.fullName}, ${a.line1}`;
}

/**
 * O03: guest form, or saved-address choice for customers, with the same
 * server validation. Errors show inline and in a summary, and focus moves
 * to the first invalid field (E07). Unsupported regions show E14 and keep
 * what was entered.
 */
export function DeliveryForm({ view }: { view: CheckoutView }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const { viewer, delivery } = view;
  const saved = viewer.kind === "customer" ? viewer.savedAddresses : [];
  const defaultAddress = saved.find((a) => a.isDefault) ?? saved.at(0);

  const [choice, setChoice] = useState<string>(delivery ? NEW_ADDRESS : (defaultAddress?.id ?? NEW_ADDRESS));
  const [values, setValues] = useState<AddressValues>(
    delivery ? addressValues(delivery.address) : defaultAddress ? addressValues(defaultAddress) : EMPTY_ADDRESS,
  );
  const [email, setEmail] = useState(delivery?.email ?? (viewer.kind === "customer" ? viewer.email : ""));
  const [saveAddress, setSaveAddress] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(delivery?.emailUpdates ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [unsupported, setUnsupported] = useState(view.coverage === "unsupported");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusErrors, setFocusErrors] = useState(0);

  useEffect(() => {
    if (focusErrors > 0) focusFirstInvalid(formRef.current);
  }, [focusErrors]);

  function choose(id: string) {
    setChoice(id);
    const address = saved.find((a) => a.id === id);
    setValues(address ? addressValues(address) : { ...EMPTY_ADDRESS, fullName: values.fullName });
    setErrors({});
  }

  async function submit() {
    setBusy(true);
    setFormError(null);
    setUnsupported(false);
    try {
      await api.checkout.saveDelivery({
        ...addressInput(values),
        email,
        saveAddress: viewer.kind === "customer" && choice === NEW_ADDRESS && saveAddress,
        emailUpdates,
      });
      setErrors({});
      router.push("/checkout/shipping");
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === "validation_failed" && e.fieldErrors) {
        setErrors(firstErrors(e.fieldErrors));
        setFocusErrors((n) => n + 1);
      } else if (e instanceof ApiError && e.code === "shipping_unavailable") {
        setErrors({});
        setUnsupported(true);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    }
  }

  const summary = summaryItems(errors, { ...values, email }, LABELS, "", FIELD_ORDER);

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-4"
      aria-label="Contact and delivery address"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {unsupported ? (
        <ShippingUnavailable
          editAddress={
            <button type="button" className={primaryButton} onClick={() => document.getElementById("line1")?.focus()}>
              Edit address
            </button>
          }
        />
      ) : null}
      <ErrorSummary items={summary} />

      {saved.length > 0 ? (
        <fieldset className={fieldBox}>
          <legend className={`${fieldLabel} float-left mb-1 w-full`}>Saved address</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {saved.map((a) => (
              <label key={a.id} className="flex items-center gap-2">
                <input type="radio" name="saved-address" checked={choice === a.id} onChange={() => { choose(a.id); }} />
                {savedLabel(a)}
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="radio" name="saved-address" checked={choice === NEW_ADDRESS} onChange={() => { choose(NEW_ADDRESS); }} />
              Use a new address
            </label>
          </div>
        </fieldset>
      ) : null}

      <AddressForm
        idPrefix=""
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next);
          if (choice !== NEW_ADDRESS) setChoice(NEW_ADDRESS);
        }}
        besideName={
          <Field id="email" label="Email" required error={errors.email} className="flex-1">
            <input
              {...controlProps("email", errors.email)}
              type="email"
              className={inputClass}
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
            />
          </Field>
        }
      />

      <div className="flex flex-col gap-1 text-sm">
        {viewer.kind === "customer" ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={saveAddress && choice === NEW_ADDRESS}
              disabled={choice !== NEW_ADDRESS}
              onChange={(e) => { setSaveAddress(e.target.checked); }}
            />
            Save this address to my account
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={emailUpdates} onChange={(e) => { setEmailUpdates(e.target.checked); }} />
          Send order updates by email (transactional updates always sent)
        </label>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!hydrated || busy}>
          {busy ? "Saving…" : "Continue to delivery method"}
        </button>
        <Link href="/checkout/identity" className={textLink}>
          Back
        </Link>
      </div>
    </form>
  );
}
