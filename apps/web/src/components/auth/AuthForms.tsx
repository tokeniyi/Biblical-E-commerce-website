"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type SubmitEvent } from "react";
import { PASSWORD_MIN_LENGTH, safeReturnTo } from "@your-app/shared";
import { ErrorSummary, type SummaryItem } from "@/components/forms/ErrorSummary";
import { Field, controlProps, inputClass } from "@/components/forms/Field";
import { primaryButton } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";

type Errors = Record<string, string | undefined>;

/** FormData entries are strings for text inputs; files never appear here. */
function formText(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

function toErrors(e: ApiError): Errors {
  const out: Errors = {};
  for (const [key, messages] of Object.entries(e.fieldErrors ?? {})) out[key] = messages[0];
  return out;
}

function summary(errors: Errors, ids: Record<string, string>): SummaryItem[] {
  return Object.entries(errors).flatMap(([key, message]) =>
    message && ids[key] ? [{ fieldId: ids[key], message }] : [],
  );
}

/** A01 / B01 sign-in. Errors stay generic so accounts can't be enumerated. */
export function SignInForm({ returnTo, audience = "customer" }: { returnTo: string | null; audience?: "customer" | "staff" }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const fallback = audience === "staff" ? "/admin" : "/account";
  const ids = { email: `${audience}-email`, password: `${audience}-password` };

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = formText(data.get(ids.email));
    const password = formText(data.get(ids.password));
    const local: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) local.email = "Enter an email address like name@example.com.";
    if (!password) local.password = "Enter your password.";
    setFormError("");
    setErrors(local);
    if (Object.keys(local).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      await api.signIn({ email, password, audience });
      router.push(safeReturnTo(returnTo, fallback));
      router.refresh();
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === "validation_failed") {
        setErrors(toErrors(e));
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      <ErrorSummary ref={summaryRef} items={summary(errors, ids)} />
      {formError ? (
        <p role="alert" className="rounded-xl border border-danger bg-brand-soft p-3 text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <Field id={ids.email} label="Email" required error={errors.email}>
        <input {...controlProps(ids.email, errors.email)} type="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field id={ids.password} label="Password" required error={errors.password}>
        <input {...controlProps(ids.password, errors.password)} type="password" autoComplete="current-password" className={inputClass} />
      </Field>
      {audience === "customer" ? (
        <Link href="/password/forgot" className="self-start text-sm font-medium text-brand underline underline-offset-4">
          Forgot password?
        </Link>
      ) : null}
      <button type="submit" className={`${primaryButton} w-full`} disabled={!hydrated || busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

/** A02 create account. */
export function RegisterForm({ returnTo }: { returnTo: string | null }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = { name: "register-name", email: "register-email", password: "register-password" };

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      name: formText(data.get(ids.name)),
      email: formText(data.get(ids.email)),
      password: formText(data.get(ids.password)),
      marketingOptIn: data.get("register-marketing") === "on",
    };
    const local: Errors = {};
    if (!input.name.trim()) local.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) local.email = "Enter an email address like name@example.com.";
    if (input.password.length < PASSWORD_MIN_LENGTH) local.password = `Use at least ${String(PASSWORD_MIN_LENGTH)} characters.`;
    setFormError("");
    setErrors(local);
    if (Object.keys(local).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      await api.register(input);
      router.push(safeReturnTo(returnTo, "/account?welcome=1"));
      router.refresh();
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === "validation_failed") {
        setErrors(toErrors(e));
        requestAnimationFrame(() => summaryRef.current?.focus());
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      <ErrorSummary ref={summaryRef} items={summary(errors, ids)} />
      {formError ? (
        <p role="alert" className="rounded-xl border border-danger bg-brand-soft p-3 text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <Field id={ids.name} label="Full name" required error={errors.name}>
        <input {...controlProps(ids.name, errors.name)} autoComplete="name" className={inputClass} />
      </Field>
      <Field id={ids.email} label="Email" required error={errors.email}>
        <input {...controlProps(ids.email, errors.email)} type="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field
        id={ids.password}
        label="Password"
        required
        error={errors.password}
        hint={`At least ${String(PASSWORD_MIN_LENGTH)} characters. Password managers welcome.`}
      >
        <input {...controlProps(ids.password, errors.password)} type="password" autoComplete="new-password" className={inputClass} />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="register-marketing" className="mt-0.5" />
        <span>Email me reading plans and new editions (optional)</span>
      </label>
      <button type="submit" className={`${primaryButton} w-full`} disabled={!hydrated || busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
