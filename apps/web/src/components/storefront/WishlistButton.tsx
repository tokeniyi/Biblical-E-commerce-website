"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api/client";
import { textLink } from "@/components/ui/styles";

type WishlistButtonProps = {
  sku: string;
  productName: string;
  signedIn: boolean;
  saved: boolean;
  /** Visible text: "♡ Save" on cards, "♡ Wishlist" on C05, "Save to wishlist" on E05. */
  label?: string;
};

function loginHref(returnTo: string, reason?: "session-expired"): string {
  const params = new URLSearchParams({ returnTo });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

/**
 * ♡ Save → A12 / A01. Signed out it links to sign in with returnTo set to
 * this page (C01: "Wishlist requires A01, with returnTo preserved").
 * Signed in it saves the SKU (idempotent) and offers the wishlist.
 */
export function WishlistButton({ sku, productName, signedIn, saved: initiallySaved, label = "♡ Save" }: WishlistButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  if (!signedIn) {
    return (
      <Link href={loginHref(returnTo)} className={textLink} aria-label={`${label} ${productName} (sign in to save)`}>
        {label}
      </Link>
    );
  }

  if (saved) {
    return (
      <p className="text-sm">
        <span>♥ Saved</span>
        <span className="sr-only"> {productName}</span>
        {" · "}
        <Link href="/account/wishlist" className="underline">
          View wishlist
        </Link>
      </p>
    );
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.wishlist.add(sku);
      setSaved(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === "session_expired") {
        router.push(loginHref(returnTo, "session-expired"));
      } else if (e instanceof ApiError && e.code === "unauthenticated") {
        router.push(loginHref(returnTo));
      } else {
        setError(e instanceof ApiError ? e.message : "Couldn’t save. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={`${textLink} self-start text-left`}
        disabled={busy}
        aria-label={`${busy ? "Saving…" : label} ${productName}`}
        onClick={() => void save()}
      >
        {busy ? "Saving…" : label}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
