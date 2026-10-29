"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SavedAddressInputSchema, type Address } from "@your-app/shared";
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
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { signInRedirect } from "@/lib/auth-redirect";
import { useHydrated } from "@/lib/use-hydrated";

const LIST = "/account/addresses";
const FIELD_ORDER = ["fullName", "email", ...ADDRESS_FIELD_ORDER.slice(1)] as const;
const LABELS: Record<string, string> = { ...ADDRESS_LABELS, email: "Email" };

type SavedAddressFormProps = {
  /** Null for a new address. */
  address: Address | null;
  defaultEmail: string;
  /** The first address always becomes the default. */
  isFirst: boolean;
};

/**
 * A09 add / edit: the shared AddressForm with O03's validation (E07: summary,
 * inline errors, focus the first invalid field). Saving returns to the list.
 */
export function SavedAddressForm({ address, defaultEmail, isFirst }: SavedAddressFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<AddressValues>(address ? addressValues(address) : EMPTY_ADDRESS);
  const [email, setEmail] = useState(address?.email ?? defaultEmail);
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? isFirst);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const returnTo = address ? `${LIST}/${encodeURIComponent(address.id)}/edit` : `${LIST}/new`;

  useEffect(() => {
    if (focusTick > 0) focusFirstInvalid(formRef.current);
  }, [focusTick]);

  async function submit() {
    setFormError(null);
    const input = { ...addressInput(values), email, isDefault };
    const local = SavedAddressInputSchema.safeParse(input);
    if (!local.success) {
      setErrors(firstErrors(local.error.flatten().fieldErrors));
      setFocusTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (address) await api.account.updateAddress(address.id, input);
      else await api.account.addAddress(input);
      router.push(`${LIST}?status=saved`);
      router.refresh();
    } catch (e) {
      setBusy(false);
      const redirect = signInRedirect(e, returnTo);
      if (redirect) {
        router.push(redirect);
      } else if (e instanceof ApiError && e.code === "validation_failed" && e.fieldErrors) {
        setErrors(firstErrors(e.fieldErrors));
        setFocusTick((n) => n + 1);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="address-form-title"
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 id="address-form-title" className="text-base font-semibold">
        {address ? "Edit address" : "Add address"}
      </h2>
      <ErrorSummary items={summaryItems(errors, { ...values, email }, LABELS, "", FIELD_ORDER)} />
      <AddressForm
        idPrefix=""
        values={values}
        errors={errors}
        onChange={setValues}
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
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDefault}
          // The only address is the default; there is nothing to switch to.
          disabled={isFirst && !address}
          onChange={(e) => { setIsDefault(e.target.checked); }}
        />
        Set as my default delivery address
      </label>
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!hydrated || busy}>
          {busy ? "Saving…" : "Save address"}
        </button>
        <Link href={LIST} className={textLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
