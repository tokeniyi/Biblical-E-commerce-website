"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProfileInputSchema, type Profile } from "@your-app/shared";
import { firstErrors, summaryItems } from "@/components/forms/AddressForm";
import { ErrorSummary, focusFirstInvalid } from "@/components/forms/ErrorSummary";
import { Field, controlProps, inputClass, type FieldErrors } from "@/components/forms/Field";
import { UnsavedChangesGuard } from "@/components/forms/UnsavedChangesGuard";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { signInRedirect } from "@/lib/auth-redirect";
import { saveDraft, takeDraft } from "@/lib/drafts";
import { useHydrated } from "@/lib/use-hydrated";

const RETURN_TO = "/account/profile";
const DRAFT_KEY = "profile";
const LABELS: Record<string, string> = { firstName: "First name", lastName: "Last name", email: "Email", phone: "Phone" };
const ORDER = ["firstName", "lastName", "email", "phone"] as const;

type Values = { firstName: string; lastName: string; email: string; phone: string; marketingOptIn: boolean };

function valuesOf(profile: Profile): Values {
  return { ...profile, phone: profile.phone ?? "" };
}

function same(a: Values, b: Values): boolean {
  return (Object.keys(a) as (keyof Values)[]).every((k) => a[k] === b[k]);
}

/**
 * A08. Validated before saving (inline + summary, focus first error).
 * Leaving with unsaved changes asks first. Saving announces success and
 * stays on the page (E23). A new email must be verified (A03); past
 * orders keep the contact details they were placed with.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState<Values>(() => valuesOf(profile));
  const [values, setValues] = useState<Values>(() => valuesOf(profile));
  const [verified, setVerified] = useState(profile.emailVerified);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{ verificationSentTo: string | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  // A draft kept when the session expired mid-edit (E11) comes back once.
  useEffect(() => {
    const draft = takeDraft(DRAFT_KEY) as Values | null;
    if (draft) setValues(draft);
  }, []);

  useEffect(() => {
    if (focusTick > 0) focusFirstInvalid(formRef.current);
  }, [focusTick]);

  const dirty = !same(values, saved);
  const set = (key: Exclude<keyof Values, "marketingOptIn">) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  async function submit() {
    setFormError(null);
    setStatus(null);
    const local = ProfileInputSchema.safeParse(values);
    if (!local.success) {
      setErrors(firstErrors(local.error.flatten().fieldErrors));
      setFocusTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const result = await api.account.updateProfile(values);
      const next = valuesOf(result.profile);
      setSaved(next);
      setValues(next);
      setVerified(result.profile.emailVerified);
      setStatus({ verificationSentTo: result.verificationSentTo });
      router.refresh();
    } catch (e) {
      const redirect = signInRedirect(e, RETURN_TO);
      if (redirect) {
        saveDraft(DRAFT_KEY, values);
        router.push(redirect);
        return;
      }
      if (e instanceof ApiError && e.code === "validation_failed" && e.fieldErrors) {
        setErrors(firstErrors(e.fieldErrors));
        setFocusTick((n) => n + 1);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const text = (key: "firstName" | "lastName" | "email" | "phone", autoComplete: string, options: { type?: string; required?: boolean; hint?: string } = {}) => (
    <Field id={key} label={LABELS[key] ?? key} required={options.required ?? true} error={errors[key]} hint={options.hint} className="flex-1">
      <input
        {...controlProps(key, errors[key])}
        type={options.type ?? "text"}
        className={inputClass}
        autoComplete={autoComplete}
        required={options.required ?? true}
        value={values[key]}
        onChange={set(key)}
      />
    </Field>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <UnsavedChangesGuard dirty={dirty} />
      <form
        ref={formRef}
        noValidate
        aria-labelledby="personal-title"
        className={panel}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 id="personal-title" className="text-base font-semibold">
          Personal details
        </h2>
        <ErrorSummary items={summaryItems(errors, values as unknown as Record<string, string>, LABELS, "", ORDER)} />
        <div className="flex flex-col gap-4 sm:flex-row">
          {text("firstName", "given-name")}
          {text("lastName", "family-name")}
        </div>
        {text("email", "email", {
          type: "email",
          hint: verified ? "Verified. Changes require a new verification email." : "Not verified yet. Changes require a new verification email.",
        })}
        {text("phone", "tel", { type: "tel", required: false, hint: "Optional" })}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.marketingOptIn}
            onChange={(e) => {
              setStatus(null);
              setValues((v) => ({ ...v, marketingOptIn: e.target.checked }));
            }}
          />
          Receive product offers by email
        </label>
        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={primaryButton} disabled={!hydrated || busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <Link href="/account" className={textLink}>
            Cancel
          </Link>
        </div>
      </form>
      <div role="status">
        {status ? (
          <StatusMessage title="✓ Saved">
            Your profile has been updated. No order delivery details were changed.
            {status.verificationSentTo ? ` We sent a verification link to ${status.verificationSentTo}.` : ""}
          </StatusMessage>
        ) : null}
      </div>
    </div>
  );
}
