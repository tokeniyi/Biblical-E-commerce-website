"use client";

import type { ReactNode } from "react";
import type { AddressInput } from "@your-app/shared";
import { Field, controlProps, inputClass, type FieldErrors } from "./Field";
import type { SummaryItem } from "./ErrorSummary";

export type AddressValues = {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: "US";
  phone: string;
};

export const EMPTY_ADDRESS: AddressValues = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  phone: "",
};

export function addressValues(address: AddressInput): AddressValues {
  return { ...EMPTY_ADDRESS, ...address, line2: address.line2 ?? "", phone: address.phone ?? "" };
}

/** Empty optional fields are omitted, so the server sees exactly what was entered. */
export function addressInput(values: AddressValues): AddressInput {
  const { line2, phone, ...rest } = values;
  return { ...rest, ...(line2.trim() ? { line2 } : {}), ...(phone.trim() ? { phone } : {}) };
}

export const ADDRESS_LABELS: Record<keyof AddressValues, string> = {
  fullName: "Full name",
  line1: "Address line 1",
  line2: "Apartment / suite",
  city: "City",
  state: "State",
  zip: "ZIP code",
  country: "Country",
  phone: "Phone (delivery updates)",
};

/**
 * Summary wording from Figma E07: an empty required field "is required",
 * anything else entered but rejected "is invalid".
 */
export function summaryItems(
  errors: FieldErrors,
  values: Record<string, string | undefined>,
  labels: Record<string, string>,
  idPrefix: string,
  order: readonly string[],
): SummaryItem[] {
  return order.flatMap((key) =>
    errors[key]
      ? [
          {
            fieldId: `${idPrefix}${key}`,
            message: `${labels[key] ?? key} is ${values[key]?.trim() ? "invalid" : "required"}.`,
          },
        ]
      : [],
  );
}

export const ADDRESS_FIELD_ORDER = ["fullName", "line1", "line2", "city", "state", "zip", "country", "phone"] as const;

const US_STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

type AddressFormProps = {
  /** Field id prefix, so delivery and billing forms can share a page. */
  idPrefix: string;
  values: AddressValues;
  errors: FieldErrors;
  onChange: (values: AddressValues) => void;
  /** Rendered beside Full name (O03 puts Email there). */
  besideName?: ReactNode;
};

/** AddressForm (spec §4): shared by O03 delivery, O05 billing and, later, A09. */
export function AddressForm({ idPrefix, values, errors, onChange, besideName }: AddressFormProps) {
  const id = (key: keyof AddressValues) => `${idPrefix}${key}`;
  const text = (key: keyof AddressValues, autoComplete: string, required = true) => (
    <Field id={id(key)} label={ADDRESS_LABELS[key]} required={required} error={errors[key]} hint={required ? undefined : "Optional"} className="flex-1">
      <input
        {...controlProps(id(key), errors[key])}
        className={inputClass}
        autoComplete={autoComplete}
        required={required}
        value={values[key]}
        onChange={(e) => { onChange({ ...values, [key]: e.target.value }); }}
      />
    </Field>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        {text("fullName", "name")}
        {besideName}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        {text("line1", "address-line1")}
        {text("line2", "address-line2", false)}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        {text("city", "address-level2")}
        <Field id={id("state")} label={ADDRESS_LABELS.state} required error={errors.state} className="flex-1">
          <select
            {...controlProps(id("state"), errors.state)}
            className={inputClass}
            autoComplete="address-level1"
            required
            value={values.state}
            onChange={(e) => { onChange({ ...values, state: e.target.value }); }}
          >
            <option value="">Choose a state</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id("zip")} label={ADDRESS_LABELS.zip} required error={errors.zip} className="flex-1">
          <input
            {...controlProps(id("zip"), errors.zip)}
            className={inputClass}
            autoComplete="postal-code"
            inputMode="numeric"
            required
            value={values.zip}
            onChange={(e) => { onChange({ ...values, zip: e.target.value }); }}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Field id={id("country")} label={ADDRESS_LABELS.country} required error={errors.country} className="flex-1">
          <select
            {...controlProps(id("country"), errors.country)}
            className={inputClass}
            autoComplete="country"
            required
            value={values.country}
            onChange={() => { onChange({ ...values, country: "US" }); }}
          >
            <option value="US">United States</option>
          </select>
        </Field>
        {text("phone", "tel", false)}
      </div>
    </div>
  );
}

/** Server field errors (first message per field), keyed as the form keys them. */
export function firstErrors(fieldErrors: Record<string, string[]> | undefined, prefix = ""): FieldErrors {
  const out: FieldErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
    if (!prefix || key.startsWith(prefix)) out[key.slice(prefix.length)] = messages[0];
  }
  return out;
}
