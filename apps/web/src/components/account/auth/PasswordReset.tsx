"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmailInputSchema, PASSWORD_MIN_LENGTH, ResetPasswordInputSchema } from "@your-app/shared";
import { firstErrors } from "@/components/forms/AddressForm";
import { Field, controlProps, inputClass, type FieldErrors } from "@/components/forms/Field";
import { PasswordField } from "@/components/forms/PasswordField";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useCooldown } from "@/lib/use-cooldown";
import { useHydrated } from "@/lib/use-hydrated";

/** A04 → A05 hand-off: the address, so A05 can resend without asking again. Tab-scoped. */
const SENT_KEY = "password-reset";
type Sent = { email: string; retryAt: number };

function readSent(): Sent | null {
  try {
    const raw = sessionStorage.getItem(SENT_KEY);
    return raw ? (JSON.parse(raw) as Sent) : null;
  } catch {
    return null;
  }
}

function writeSent(email: string, retryAfterSeconds: number): void {
  try {
    sessionStorage.setItem(SENT_KEY, JSON.stringify({ email, retryAt: Date.now() + retryAfterSeconds * 1000 }));
  } catch {
    // Without storage A05 offers "Use another email" instead of resend.
  }
}

function signInHref(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * A04. The email format is checked here, but the answer after submitting
 * is always the same (A05), whether or not the address has an account.
 */
export function ForgotPasswordForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setFormError(null);
    const local = EmailInputSchema.safeParse(email);
    if (!local.success) {
      setError(local.error.issues[0]?.message);
      inputRef.current?.focus();
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const { retryAfterSeconds } = await api.auth.forgotPassword(local.data);
      writeSent(local.data, retryAfterSeconds);
      router.push(`/password/sent?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (e) {
      setBusy(false);
      setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    }
  }

  return (
    <form
      noValidate
      aria-labelledby="request-title"
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 id="request-title" className="text-base font-semibold">
        Request a reset link
      </h2>
      <p className="text-base">Enter your email and we’ll send instructions if an account is eligible.</p>
      <Field id="email" label="Email" required error={error}>
        <input
          ref={inputRef}
          {...controlProps("email", error)}
          type="email"
          className={inputClass}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
        />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!hydrated || busy}>
          {busy ? "Sending…" : "Send reset instructions"}
        </button>
        <Link href={signInHref(returnTo)} className={textLink}>
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

/** A05. Same copy for every address; resend after the 60 s cooldown. */
export function ResetSent({ returnTo }: { returnTo: string }) {
  const hydrated = useHydrated();
  const cooldown = useCooldown();
  const [sent, setSent] = useState<Sent | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const stored = readSent();
    setSent(stored);
    if (stored) cooldown.start(Math.max(0, Math.ceil((stored.retryAt - Date.now()) / 1000)));
    // Only on arrival: the countdown runs from what A04 recorded.
  }, []);

  async function resend() {
    if (!sent) return;
    setBusy(true);
    try {
      const { retryAfterSeconds } = await api.auth.forgotPassword(sent.email);
      writeSent(sent.email, retryAfterSeconds);
      cooldown.start(retryAfterSeconds);
      setStatus("If an account matches, new instructions are on the way.");
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StatusMessage role="status" title="If an account matches, instructions are on the way">
        Check your inbox and spam folder. Use the secure link to choose a new password. The link expires after 30 minutes.
      </StatusMessage>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={signInHref(returnTo)} className={primaryButton}>
          Back to sign in
        </Link>
        <Link href={`/password/forgot?returnTo=${encodeURIComponent(returnTo)}`} className={textLink}>
          Use another email
        </Link>
        {sent ? (
          <>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className={`${textLink} disabled:no-underline disabled:text-muted`}
              disabled={!hydrated || busy || cooldown.remaining > 0}
              onClick={() => void resend()}
            >
              {cooldown.remaining > 0 ? `Resend after ${String(cooldown.remaining)} s` : busy ? "Sending…" : "Resend"}
            </button>
          </>
        ) : null}
      </div>
      <p role="status" className="text-sm">
        {status}
      </p>
    </>
  );
}

/**
 * A06 invalid variant and E10: no password fields at all, only the ways
 * out. `copy` picks the A06 panel wording or the E10 frame wording.
 */
export function ResetLinkInvalid({ copy = "A06" }: { copy?: "A06" | "E10" }) {
  return (
    <section aria-labelledby="invalid-title" className={panel}>
      <h2 id="invalid-title" className="sr-only">
        Reset link not valid
      </h2>
      <StatusMessage role="alert" title="This reset link is no longer valid">
        {copy === "A06"
          ? "It may have expired or already been used. No password has been changed."
          : "Your password was not changed. Request a new link to continue."}
      </StatusMessage>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/password/forgot" className={primaryButton}>
          {copy === "A06" ? "Request a new link" : "Request reset"}
        </Link>
        <Link href="/login" className={textLink}>
          {copy === "A06" ? "Back to sign in" : "Sign in"}
        </Link>
      </div>
    </section>
  );
}

/**
 * A06 valid token: new password twice, mismatch shown inline. Success
 * signs the account out everywhere and sends the customer to sign in.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<"form" | "done" | "invalid">("form");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    if (focusTick > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusTick]);

  async function submit() {
    setFormError(null);
    const local = ResetPasswordInputSchema.safeParse({ token, password, confirmPassword });
    if (!local.success) {
      setErrors(firstErrors(local.error.flatten().fieldErrors));
      setFocusTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.auth.resetPassword({ token, password, confirmPassword });
      setPassword("");
      setConfirmPassword("");
      setState("done");
      // The header no longer shows a signed-in customer.
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === "token_expired") setState("invalid");
      else if (e instanceof ApiError && e.code === "validation_failed" && e.fieldErrors) {
        setErrors(firstErrors(e.fieldErrors));
        setFocusTick((n) => n + 1);
      } else setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "invalid") return <ResetLinkInvalid />;
  if (state === "done") {
    return (
      <div className="flex flex-col gap-3">
        <StatusMessage role="status" title="Password updated">
          Sign in with your new password. Other sessions are signed out.
        </StatusMessage>
        <Link href="/login" className={`${primaryButton} self-start`}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      aria-label="Set a new password"
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <PasswordField
        id="password"
        label="New password"
        autoComplete="new-password"
        value={password}
        error={errors.password}
        hint={`At least ${String(PASSWORD_MIN_LENGTH)} characters. Do not reuse your old password.`}
        onChange={setPassword}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirmPassword}
        error={errors.confirmPassword}
        onChange={setConfirmPassword}
      />
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <button type="submit" className={`${primaryButton} self-start`} disabled={!hydrated || busy}>
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
