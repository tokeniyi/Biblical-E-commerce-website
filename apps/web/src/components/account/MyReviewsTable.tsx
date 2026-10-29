"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { MyReview } from "@your-app/shared";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError, api } from "@/lib/api/client";
import { signInRedirect } from "@/lib/auth-redirect";
import { useHydrated } from "@/lib/use-hydrated";
import { stars } from "./format";

const STATUS: Record<MyReview["status"], string> = { published: "Published", pending: "Pending", rejected: "Not published" };

function reviewHref(r: MyReview): string | null {
  return r.orderId ? `/account/orders/${encodeURIComponent(r.orderId)}/items/${encodeURIComponent(r.sku)}/review` : null;
}

/** A13 list: every review of the customer's; delete asks first. */
export function MyReviewsTable({ reviews: initial }: { reviews: MyReview[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [reviews, setReviews] = useState(initial);
  const [confirming, setConfirming] = useState<MyReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  async function remove() {
    if (!confirming) return;
    setBusy(true);
    setError(null);
    try {
      setReviews((await api.account.deleteReview(confirming.id)).reviews);
      setAnnouncement(`Deleted your review of ${confirming.productName}.`);
      setConfirming(null);
      router.refresh();
    } catch (e) {
      const redirect = signInRedirect(e, "/account/reviews");
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
    <>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        Your reviews
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {reviews.length === 0 ? (
        <p className="text-base">You haven’t written any reviews yet.</p>
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[640px] text-left font-mono text-[13px] leading-snug">
            <thead className="bg-band">
              <tr>
                <th scope="col" className="p-3 font-semibold">Review</th>
                <th scope="col" className="p-3 font-semibold">Order / item</th>
                <th scope="col" className="p-3 font-semibold">Status</th>
                <th scope="col" className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => {
                const href = reviewHref(r);
                return (
                  <tr key={r.id} className="border-t border-band align-top">
                    <th scope="row" className="p-3 font-normal">
                      <span aria-label={`${String(r.rating)} out of 5 stars`}>{stars(r.rating)}</span> {r.title}
                    </th>
                    <td className="p-3">
                      {r.orderId ?? "—"} · {r.sku}
                    </td>
                    <td className="p-3">{STATUS[r.status]}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-x-1">
                        {href ? (
                          <Link href={href} className="underline" aria-label={`Edit review of ${r.productName}`}>
                            Edit
                          </Link>
                        ) : null}
                        {href ? <span aria-hidden="true">/</span> : null}
                        <button
                          type="button"
                          className="underline"
                          disabled={!hydrated}
                          aria-label={`Delete review of ${r.productName}`}
                          onClick={() => { setConfirming(r); }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={confirming !== null}
        title="Delete review confirmation"
        confirmLabel="Confirm delete"
        cancelLabel="Keep review"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!busy) setConfirming(null);
        }}
        fallbackFocusRef={headingRef}
      >
        Delete your {confirming?.status === "published" ? "published" : "pending"} review of {confirming?.productName}?
        {confirming?.status === "published" ? " This removes its public display." : ""}
      </ConfirmDialog>
    </>
  );
}
