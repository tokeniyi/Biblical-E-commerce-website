import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCents, parseReviewsQuery, reviewsQueryToParams, type ReviewsQuery, type ReviewsResponse } from "@your-app/shared";
import { PageContent } from "@/components/shell/StorefrontShell";
import { BookCover } from "@/components/storefront/BookCover";
import { NetworkError } from "@/components/storefront/NetworkError";
import { ReviewControls } from "@/components/storefront/reviews/ReviewControls";
import { ReviewItem } from "@/components/storefront/reviews/ReviewLines";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, secondaryButton, textLink } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadReviews(slug: string, query: ReviewsQuery): Promise<ReviewsResponse | null> {
  try {
    return await (await serverApi()).catalog.getReviews(slug, query);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") notFound();
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

function Histogram({ histogram, count }: { histogram: [number, number, number, number, number]; count: number }) {
  return (
    <ul className="flex flex-col gap-1 text-base">
      {histogram.map((n, i) => {
        const starsLabel = `${String(5 - i)} ${i === 4 ? "star" : "stars"}`;
        return (
          <li key={starsLabel} className="flex items-center gap-2">
            <span className="w-16">{starsLabel}</span>
            <span
              role="meter"
              aria-label={starsLabel}
              aria-valuemin={0}
              aria-valuemax={count}
              aria-valuenow={n}
              className="h-3.5 w-36 border border-ink"
            >
              <span className="block h-full bg-ink" style={{ width: `${String(count ? (n / count) * 100 : 0)}%` }} />
            </span>
            <span>{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Write a review → A13 only when the server says the viewer is eligible; otherwise guidance. */
function WriteReview({ result, returnTo }: { result: ReviewsResponse; returnTo: string }) {
  const { eligibility } = result;
  if (eligibility.status === "eligible") {
    return (
      <Link
        href={`/account/orders/${eligibility.orderId}/items/${encodeURIComponent(eligibility.sku)}/review`}
        className={`${primaryButton} self-start`}
      >
        Write a review
      </Link>
    );
  }
  const guidance = {
    "signed-out": "Reviews come from customers who received this Bible. Sign in to check whether you can review it.",
    "not-delivered": "You can review this Bible once an order containing it has been delivered.",
    "already-reviewed": "You’ve already reviewed this Bible. You can edit your review in My reviews.",
  }[eligibility.status];
  return (
    <StatusMessage title="Write a review">
      <p>{guidance}</p>
      {eligibility.status === "signed-out" ? (
        <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className={textLink}>
          Sign in
        </Link>
      ) : eligibility.status === "already-reviewed" ? (
        <Link href="/account/reviews" className={textLink}>
          My reviews
        </Link>
      ) : null}
    </StatusMessage>
  );
}

/** C06 Product reviews: stays in product context; rating, sort and page live in the URL. */
export default async function ReviewsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = parseReviewsQuery(await searchParams);
  const result = await loadReviews(slug, query);
  const basePath = `/products/${slug}/reviews`;
  const qs = reviewsQueryToParams(query).toString();
  const returnTo = qs ? `${basePath}?${qs}` : basePath;

  if (!result) {
    return (
      <PageContent screen="C06">
        <h1 className="text-[28px] font-semibold text-ink">Product reviews</h1>
        <NetworkError />
      </PageContent>
    );
  }

  const { product, rating, page, pageCount, pageSize, total, items } = result;
  const pageHref = (p: number) => {
    const params = reviewsQueryToParams({ ...result.query, page: p }).toString();
    return params ? `${basePath}?${params}` : basePath;
  };
  const start = Math.max(1, Math.min(page - 1, pageCount - 2));
  const pages = Array.from({ length: Math.min(3, pageCount) }, (_, i) => start + i);

  return (
    <PageContent screen="C06">
      <h1 className="text-[28px] font-semibold text-ink">Product reviews</h1>
      <div className="flex flex-col gap-4 md:flex-row">
        <aside aria-label="Product" className="flex w-full flex-col gap-4 md:w-[270px] md:shrink-0">
          <BookCover label={product.name} heightClass="h-[174px]" />
          <p className="text-base font-semibold">{product.name}</p>
          <p className="text-base">
            {formatCents(product.priceCents)} · {product.sku}
          </p>
          <Link href={`/products/${product.slug}?variant=${encodeURIComponent(product.sku)}`} className={`${secondaryButton} self-start`}>
            Back to Bible
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {rating ? (
            <section aria-labelledby="summary-heading" className={panel}>
              <h2 id="summary-heading" className="text-base font-semibold">
                {rating.average} / 5 from {rating.count} reviews
              </h2>
              <Histogram histogram={rating.histogram} count={rating.count} />
            </section>
          ) : null}

          <ReviewControls query={result.query} />

          {items.length > 0 ? (
            <div className="flex flex-col gap-4">
              {items.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <p className="text-base">No reviews match this filter.</p>
          )}

          {total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-muted">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} reviews
              </p>
              {pageCount > 1 ? (
                <nav aria-label="Pagination">
                  <ul className="flex items-center gap-4">
                    <li>
                      {page > 1 ? <Link href={pageHref(page - 1)}>‹ Previous</Link> : <span aria-disabled="true" className="text-muted">‹ Previous</span>}
                    </li>
                    {pages.map((p) => (
                      <li key={p}>
                        <Link
                          href={pageHref(p)}
                          aria-current={p === page ? "page" : undefined}
                          aria-label={p === page ? `Page ${String(p)}, current` : `Page ${String(p)}`}
                          className={p === page ? "font-semibold" : undefined}
                        >
                          {p === page ? `[${String(p)}]` : p}
                        </Link>
                      </li>
                    ))}
                    <li>
                      {page < pageCount ? <Link href={pageHref(page + 1)}>Next ›</Link> : <span aria-disabled="true" className="text-muted">Next ›</span>}
                    </li>
                  </ul>
                </nav>
              ) : null}
            </div>
          ) : null}

          <WriteReview result={result} returnTo={returnTo} />
        </div>
      </div>
    </PageContent>
  );
}
