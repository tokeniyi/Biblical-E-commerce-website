import type { PublicReview } from "@your-app/shared";

export function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "24 Sep 2026", as drawn. Built by hand: ICU's en-GB short month for September is "Sept". */
export function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()] ?? ""} ${String(d.getUTCFullYear())}`;
}

/** One review as drawn in C06. Helpful/Report have no wireframed behavior yet, so they are plain text. */
export function ReviewItem({ review }: { review: PublicReview }) {
  const meta = [
    review.authorName,
    review.verifiedPurchase ? "Verified purchase" : null,
    formatReviewDate(review.createdAt),
    review.variantLabel,
  ].filter(Boolean);
  return (
    <article data-testid="review" className="flex flex-col gap-3 border border-line p-4 leading-snug">
      <h3 className="text-base font-semibold">
        <span aria-label={`${String(review.rating)} out of 5 stars`}>{stars(review.rating)}</span> {review.title}
      </h3>
      <p className="text-sm">{meta.join(" · ")}</p>
      <p className="text-base">{review.body}</p>
      <p className="text-sm">Helpful ({review.helpfulCount}) · Report review</p>
    </article>
  );
}
