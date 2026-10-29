"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PASSWORD_MIN_LENGTH, RegisterInputSchema } from "@your-app/shared";
import { firstErrors, summaryItems } from "@/components/forms/AddressForm";
import { ErrorSummary, focusFirstInvalid } from "@/components/forms/ErrorSummary";
import { Field, controlProps, inputClass, type FieldErrors } from "@/components/forms/Field";
import { PasswordField } from "@/components/forms/PasswordField";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";

const LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  password: "Password",
  confirmPassword: "Confirm password",
  termsAccepted: "Terms agreement",
};
const ORDER = ["firstName", "lastName", "email", "password", "confirmPassword", "termsAccepted"] as const;

type RegisterFormProps = { returnTo: string; save: string | null; initialEmail: string };

/**
 * A02. Password policy: 12+ characters, paste and password managers allowed.
 * Marketing opt-in starts unchecked. Errors show inline and in a summary,
 * with focus on the first invalid field.
 */
export function RegisterForm({ returnTo, save, initialEmail }: RegisterFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: initialEmail,
    password: "",
    confirmPassword: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    if (focusTick > 0) focusFirstInvalid(formRef.current);
  }, [focusTick]);

  const set = (key: keyof typeof values) => (value: string) => { setValues((v) => ({ ...v, [key]: value })); };

  async function submit() {
    setFormError(null);
    const input = { ...values, termsAccepted, marketingOptIn, returnTo, ...(save ? { save } : {}) };
    const local = RegisterInputSchema.safeParse(input);
    if (!local.success) {
      setErrors(firstErrors(local.error.flatten().fieldErrors));
      setFocusTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.auth.register(input as Parameters<typeof api.auth.register>[0]);
      router.push("/verify-email");
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === "validation_failed" && e.fieldErrors) {
        setErrors(firstErrors(e.fieldErrors));
        setFocusTick((n) => n + 1);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    }
  }

  const text = (key: "firstName" | "lastName" | "email", autoComplete: string, type = "text") => (
    <Field id={key} label={LABELS[key] ?? key} required error={errors[key]} className="flex-1">
      <input
        {...controlProps(key, errors[key])}
        type={type}
        className={inputClass}
        autoComplete={autoComplete}
        required
        value={values[key]}
        onChange={(e) => { set(key)(e.target.value); }}
      />
    </Field>
  );

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="details-title"
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 id="details-title" className="text-base font-semibold">
        Account details
      </h2>
      <ErrorSummary items={summaryItems(errors, { ...values, termsAccepted: "" }, LABELS, "", ORDER)} />
      <div className="flex flex-col gap-4 sm:flex-row">
        {text("firstName", "given-name")}
        {text("lastName", "family-name")}
      </div>
      {text("email", "email", "email")}
      <PasswordField
        id="password"
        label="Password"
        autoComplete="new-password"
        value={values.password}
        error={errors.password}
        hint={`Use at least ${String(PASSWORD_MIN_LENGTH)} characters; passphrases recommended.`}
        onChange={set("password")}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={set("confirmPassword")}
      />
      <div className="flex flex-col gap-1 text-sm">
        <label className="flex items-center gap-2">
          <input
            {...controlProps("termsAccepted", errors.termsAccepted)}
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => { setTermsAccepted(e.target.checked); }}
          />
          I agree to the Terms and acknowledge the Privacy Policy.
        </label>
        {errors.termsAccepted ? (
          <p id="termsAccepted-error" className="text-danger">
            <span aria-hidden="true">! </span>
            {errors.termsAccepted}
          </p>
        ) : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={marketingOptIn} onChange={(e) => { setMarketingOptIn(e.target.checked); }} />
          Email me offers (optional)
        </label>
      </div>
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!hydrated || busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className={textLink}>
          Already registered? Sign in
        </Link>
      </div>
    </form>
  );
}
