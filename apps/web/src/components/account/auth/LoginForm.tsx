"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoginInputSchema } from "@your-app/shared";
import { firstErrors } from "@/components/forms/AddressForm";
import { Field, controlProps, inputClass, type FieldErrors } from "@/components/forms/Field";
import { PasswordField } from "@/components/forms/PasswordField";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useHydrated } from "@/lib/use-hydrated";
import { withWishlistNotice } from "@/components/account/WishlistNotice";

type LoginFormProps = {
  returnTo: string;
  returnLabel: string;
  /** A ♡ tapped while signed out: saved by the server after sign-in. */
  save: string | null;
};

type Failure = { kind: "credentials" } | { kind: "other"; message: string };

function withReturn(path: string, returnTo: string, save: string | null): string {
  const params = new URLSearchParams({ returnTo });
  if (save) params.set("save", save);
  return `${path}?${params.toString()}`;
}

/**
 * A01. Missing fields get inline errors; wrong credentials get the generic
 * E09 message (no hint whether the email exists). The email stays, the
 * password is cleared. Success goes to the safe returnTo.
 */
export function LoginForm({ returnTo, returnLabel, save }: LoginFormProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    if (focusTick === 0) return;
    if (failure) alertRef.current?.focus();
    else formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusTick, failure]);

  async function submit() {
    setFailure(null);
    const local = LoginInputSchema.safeParse({ email, password });
    if (!local.success) {
      setErrors(firstErrors(local.error.flatten().fieldErrors));
      setFocusTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const result = await api.auth.login({ email, password, keepSignedIn, returnTo, ...(save ? { save } : {}) });
      router.push(withWishlistNotice(result.returnTo, result.pendingSave));
      router.refresh();
    } catch (e) {
      setBusy(false);
      // Never keep a rejected password in the form.
      setPassword("");
      if (e instanceof ApiError && e.code === "validation_failed") {
        setErrors(firstErrors(e.fieldErrors));
      } else if (e instanceof ApiError && e.code === "invalid_credentials") {
        setFailure({ kind: "credentials" });
      } else {
        setFailure({ kind: "other", message: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
      }
      setFocusTick((n) => n + 1);
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="welcome-title"
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 id="welcome-title" className="text-base font-semibold">
        Welcome back
      </h2>
      {failure ? (
        <div ref={alertRef} tabIndex={-1} className="flex flex-col gap-2">
          {failure.kind === "credentials" ? (
            <StatusMessage role="alert" title="Email or password is incorrect" className="border-2 border-danger">
              Check your details and try again. Your cart is still saved.
            </StatusMessage>
          ) : (
            <StatusMessage role="alert" title="We couldn’t sign you in" className="border-2 border-danger">
              {failure.message}
            </StatusMessage>
          )}
        </div>
      ) : null}
      <Field id="email" label="Email" required error={errors.email}>
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
      <PasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        error={errors.password}
        onChange={setPassword}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={keepSignedIn} onChange={(e) => { setKeepSignedIn(e.target.checked); }} />
        Keep me signed in on this device
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!hydrated || busy}>
          {busy ? "Signing in…" : failure?.kind === "credentials" ? "Try again" : "Sign in"}
        </button>
        <Link href={`/password/forgot?returnTo=${encodeURIComponent(returnTo)}`} className={textLink}>
          {failure?.kind === "credentials" ? "Reset password" : "Forgot password"}
        </Link>
      </div>
      <div className="text-sm">
        <p>
          New customer?{" "}
          <Link href={withReturn("/register", returnTo, save)} className="underline">
            Create account
          </Link>
        </p>
        <p>Returning to: {returnLabel}</p>
      </div>
    </form>
  );
}
