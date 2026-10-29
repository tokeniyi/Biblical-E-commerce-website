"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { destinationLabel } from "@/components/account/destination";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { useCooldown } from "@/lib/use-cooldown";
import { useHydrated } from "@/lib/use-hydrated";

/** "Resend status: sent. Try again after 60 seconds." with a live countdown. */
function ResendButton({ label, token }: { label: string; token?: string }) {
  const hydrated = useHydrated();
  const cooldown = useCooldown();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const { retryAfterSeconds } = await api.auth.resendVerification(token);
      setSent(true);
      cooldown.start(retryAfterSeconds);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={primaryButton}
        disabled={!hydrated || busy || cooldown.remaining > 0}
        onClick={() => void resend()}
      >
        {busy ? "Sending…" : label}
      </button>
      <p role="status" className="basis-full text-sm">
        {sent
          ? cooldown.remaining > 0
            ? `Resend status: sent. Try again after ${String(cooldown.remaining)} seconds.`
            : "Resend status: sent. You can send another link now."
          : ""}
      </p>
      {error ? (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

/** A03 pending: a link was sent; resend (60 s cooldown) or change the address. */
export function VerificationPending({ email, signedIn }: { email: string | null; signedIn: boolean }) {
  return (
    <section aria-labelledby="pending-title" className={panel}>
      <h2 id="pending-title" className="text-base font-semibold">
        {email ? `Check ${email}` : "Check your email"}
      </h2>
      <p className="text-base">We sent a verification link. Open it to finish setting up your account.</p>
      <div className="flex flex-wrap items-center gap-3">
        <ResendButton label="Resend email" />
        {/* A signed-in customer changes the address on their profile; a new sign-up starts again. */}
        <Link href={signedIn ? "/account/profile" : "/register"} className={textLink}>
          Change email
        </Link>
      </div>
    </section>
  );
}

/** A03 verified: continue to the account, or to the destination kept from sign-up (O03). */
export function VerifiedSuccess({ returnTo }: { returnTo: string }) {
  const elsewhere = returnTo !== "/account";
  return (
    <div className="flex flex-col gap-3">
      <StatusMessage role="status" title="✓ Email verified">
        Your account is ready.
      </StatusMessage>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={returnTo} className={primaryButton}>
          {elsewhere ? `Continue to ${destinationLabel(returnTo)}` : "Continue to your account"}
        </Link>
        {elsewhere ? (
          <Link href="/account" className={textLink}>
            Your account
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** A03 expired or already-used link: nothing about the account is shown. */
export function VerificationExpired({ token }: { token?: string }) {
  return (
    <section aria-labelledby="expired-title" className={panel}>
      <h2 id="expired-title" className="text-base font-semibold">
        This verification link has expired
      </h2>
      <p className="text-sm">This verification link has expired. No account data was exposed.</p>
      <div className="flex flex-wrap items-center gap-3">
        <ResendButton label="Send a new link" token={token} />
        <Link href="/login" className={textLink}>
          Sign in
        </Link>
      </div>
    </section>
  );
}

type LinkState =
  | { kind: "checking" }
  | { kind: "verified"; returnTo: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

/**
 * Opens the emailed link once. The POST runs after hydration (never on a
 * plain GET, so link previews can't use it up) and only once per page.
 */
export function VerifyEmailLink({ token }: { token: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<LinkState>({ kind: "checking" });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.auth
      .verifyEmail(token)
      .then((result) => {
        setState({ kind: "verified", returnTo: result.returnTo });
        // The header now shows a signed-in customer.
        router.refresh();
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "token_expired") setState({ kind: "expired" });
        else setState({ kind: "error", message: e instanceof ApiError ? e.message : "Something went wrong. Reload to try again." });
      });
  }, [token, router]);

  switch (state.kind) {
    case "checking":
      return (
        <p role="status" className="text-base">
          Checking your link…
        </p>
      );
    case "verified":
      return <VerifiedSuccess returnTo={state.returnTo} />;
    case "expired":
      return <VerificationExpired token={token} />;
    case "error":
      return (
        <StatusMessage role="alert" title="We couldn’t check your link">
          {state.message}
        </StatusMessage>
      );
  }
}
