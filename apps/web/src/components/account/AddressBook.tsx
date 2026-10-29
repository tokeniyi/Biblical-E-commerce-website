"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Address } from "@your-app/shared";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { signInRedirect } from "@/lib/auth-redirect";
import { useHydrated } from "@/lib/use-hydrated";

const RETURN_TO = "/account/addresses";

/** A09 list and empty variants; delete asks first and never touches past orders. */
export function AddressBook({ addresses, notice }: { addresses: Address[]; notice: "saved" | "deleted" | null }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [confirming, setConfirming] = useState<Address | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirming) return;
    setBusy(true);
    setError(null);
    try {
      await api.account.deleteAddress(confirming.id);
      setConfirming(null);
      router.replace(`${RETURN_TO}?status=deleted`);
      router.refresh();
    } catch (e) {
      const redirect = signInRedirect(e, RETURN_TO);
      if (redirect) {
        router.push(redirect);
        return;
      }
      setConfirming(null);
      setError(e instanceof ApiError ? e.message : "Couldn’t delete. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        Saved addresses
      </h2>
      <div role="status">
        {notice === "saved" ? <StatusMessage title="✓ Address saved" /> : null}
        {notice === "deleted" ? <StatusMessage title="✓ Address deleted">Existing orders are not affected.</StatusMessage> : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {addresses.length === 0 ? (
        <StatusMessage title="No addresses saved yet">
          <Link href="/account/addresses/new" className="underline">
            Add your first address
          </Link>
          . Guest{" "}
          <Link href="/checkout/delivery" className="underline">
            delivery forms
          </Link>{" "}
          remain available.
        </StatusMessage>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={panel}>
              <h3 className="text-base font-semibold">{a.isDefault ? "Saved address / Default" : "Saved address"}</h3>
              <p className="text-sm">
                {a.fullName}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.state} {a.zip} · {a.country}
              </p>
              <p className="flex flex-wrap gap-2 text-sm">
                <Link href={`/account/addresses/${encodeURIComponent(a.id)}/edit`} className="underline" aria-label={`Edit ${a.line1}`}>
                  Edit
                </Link>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="underline"
                  disabled={!hydrated}
                  aria-label={`Delete ${a.line1}`}
                  onClick={() => { setConfirming(a); }}
                >
                  Delete
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}
      {addresses.length > 0 ? (
        <Link href="/account/addresses/new" className={`${primaryButton} self-start`}>
          Add address
        </Link>
      ) : null}
      <ConfirmDialog
        open={confirming !== null}
        title="Delete confirmation"
        confirmLabel="Delete"
        cancelLabel="Keep"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!busy) setConfirming(null);
        }}
        fallbackFocusRef={headingRef}
      >
        Delete this saved address? Existing orders are not affected.
      </ConfirmDialog>
    </div>
  );
}
