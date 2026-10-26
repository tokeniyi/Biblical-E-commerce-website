"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { reviewsQueryToParams, type ReviewsQuery } from "@your-app/shared";
import { fieldBox, fieldLabel } from "@/components/ui/styles";

const RATINGS: { value: ReviewsQuery["rating"]; label: string }[] = [
  { value: "all", label: "All ratings" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
];

const SORTS: { value: ReviewsQuery["sort"]; label: string }[] = [
  { value: "helpful", label: "Most helpful" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest", label: "Lowest rating" },
];

/** C06 rating filter and sort: URL-driven, back to page 1 on change. */
export function ReviewControls({ query }: { query: ReviewsQuery }) {
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const [pending, startTransition] = useTransition();

  function go(patch: Partial<ReviewsQuery>) {
    const params = reviewsQueryToParams({ ...query, ...patch, page: 1 }).toString();
    startTransition(() => {
      router.push(params ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  return (
    <div aria-busy={pending || undefined} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className={fieldBox}>
        <label htmlFor={`${id}-rating`} className={fieldLabel}>
          Rating filter
        </label>
        <select
          id={`${id}-rating`}
          value={query.rating}
          onChange={(e) => {
            go({ rating: e.target.value as ReviewsQuery["rating"] });
          }}
          className="border border-line bg-white p-1"
        >
          {RATINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldBox}>
        <label htmlFor={`${id}-sort`} className={fieldLabel}>
          Sort reviews
        </label>
        <select
          id={`${id}-sort`}
          value={query.sort}
          onChange={(e) => {
            go({ sort: e.target.value as ReviewsQuery["sort"] });
          }}
          className="border border-line bg-white p-1"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
