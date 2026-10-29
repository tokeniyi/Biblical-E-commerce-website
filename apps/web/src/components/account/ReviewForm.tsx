"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS, ReviewInputSchema, type ReviewFormView } from "@your-app/shared";
import { firstErrors, summaryItems } from "@/components/forms/AddressForm";
import { ErrorSummary, focusFirstInvalid } from "@/components/forms/ErrorSummary";
import { Field, controlProps, errorId, inputClass, type FieldErrors } from "@/components/forms/Field";
import { fieldBox, fieldLabel, panel, primaryButton, textLink } from "@/components/ui/styles";
import { ApiError, api } from "@/lib/api/client";
import { signInRedirect } from "@/lib/auth-redirect";
import { saveDraft, takeDraft } from "@/lib/drafts";
import { useHydrated } from "@/lib/use-hydrated";
import { shortDate } from "./format";

const LABELS: Record<string, string> = { rating: "Rating", title: "Review title", body: "Review body" };
const ORDER = ["rating", "title", "body"] as const;

type Eligible = Extract<ReviewFormView, { status: "eligible" }>;
type Draft = { rating: number; title: string; body: string };

/**
 * A13 write / edit. Rating, title and body are required (10–2,000
 * characters). Submitting sends it to moderation: pending, not on C06.
 * A draft survives a forced sign-in (E11).
 */
export function ReviewForm({ view }: { view: Eligible }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  const { item, existing } = view;
  const returnTo = `/account/orders/${encodeURIComponent(item.orderId)}/items/${encodeURIComponent(item.sku)}/review`;
  const draftKey = `review:${item.orderId}:${item.sku}`;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    const draft = takeDraft(draftKey) as Draft | null;
    if (draft) {
      setRating(draft.rating);
      setTitle(draft.title);
      setBody(draft.body);
    }
  }, [draftKey]);

  useEffect(() => {
    if (focusTick > 0) focusFirstInvalid(formRef.current);
  }, [focusTick]);

  async function submit() {
    setFormError(null);
    const input = { rating, title, body };
    const local = ReviewInputSchema.safeParse(input);
    if (!local.success) {
      setErrors(firstErrors(local.error.flatten().fieldErrors));
      setFocusTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.account.submitReview(item.orderId, item.sku, local.data);
      router.push("/account/reviews?status=submitted");
      router.refresh();
    } catch (e) {
      const redirect = signInRedirect(e, returnTo);
      if (redirect) {
        saveDraft(draftKey, input);
        router.push(redirect);
        return;
      }
      setBusy(false);
      if (e instanceof ApiError && e.code === "validation_failed" && e.fieldErrors) {
        setErrors(firstErrors(e.fieldErrors));
        setFocusTick((n) => n + 1);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby="write-title"
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 id="write-title" className="text-base font-semibold">
        {existing ? "Edit review" : "Write review"} / eligible delivered purchase
      </h2>
      <p className="text-sm">
        {item.productName} · {item.sku}
        <br />
        Order {item.orderId} · Delivered {shortDate(item.deliveredAt)} · Verified purchase
      </p>
      {existing?.status === "published" ? (
        <p className="text-sm">Saving changes sends your review back to moderation; it leaves the product page until approved.</p>
      ) : null}
      <ErrorSummary
        items={summaryItems(errors, { rating: rating ? String(rating) : "", title, body }, LABELS, "", ORDER).map((i) =>
          i.fieldId === "rating" ? { ...i, fieldId: "rating-1" } : i,
        )}
      />
      <fieldset
        className={`${fieldBox} ${errors.rating ? "border-2 border-danger" : ""}`}
        aria-describedby={errors.rating ? errorId("rating") : undefined}
      >
        <legend className={`${fieldLabel} float-left mb-1 w-full`}>Rating *</legend>
        <div className="flex flex-wrap items-center gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex items-center gap-1">
              <input
                id={`rating-${String(n)}`}
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                aria-invalid={errors.rating ? true : undefined}
                onChange={() => { setRating(n); }}
              />
              <span aria-hidden="true">{"★".repeat(n)}</span>
              <span className="sr-only">{n} {n === 1 ? "star" : "stars"}</span>
            </label>
          ))}
          <span className="text-muted">Choose 1–5</span>
        </div>
        {errors.rating ? (
          <p id={errorId("rating")} className="text-danger">
            <span aria-hidden="true">! </span>
            {errors.rating}
          </p>
        ) : null}
      </fieldset>
      <Field id="title" label="Review title" required error={errors.title}>
        <input
          {...controlProps("title", errors.title)}
          className={inputClass}
          required
          value={title}
          onChange={(e) => { setTitle(e.target.value); }}
        />
      </Field>
      <Field
        id="body"
        label="Review body"
        required
        error={errors.body}
        hint={`${String(REVIEW_MIN_CHARS)}–${REVIEW_MAX_CHARS.toLocaleString("en-US")} characters`}
      >
        <textarea
          {...controlProps("body", errors.body)}
          className={`${inputClass} min-h-32`}
          placeholder="Describe your experience…"
          required
          maxLength={REVIEW_MAX_CHARS}
          value={body}
          onChange={(e) => { setBody(e.target.value); }}
        />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!hydrated || busy}>
          {busy ? "Submitting…" : "Submit"}
        </button>
        <Link href="/account/reviews" className={textLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
