import Link from "next/link";
import { MyReviewsTable } from "@/components/account/MyReviewsTable";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel } from "@/components/ui/styles";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";
import { first, type SearchParams } from "@/lib/search-params";

const RETURN_TO = "/account/reviews";

/** A13 My reviews: list, pending notice after submitting, and delivered items waiting for a review. */
export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCustomerPage(RETURN_TO);
  const submitted = first((await searchParams).status) === "submitted";
  const data = await loadAccountData(RETURN_TO, (api) => api.account.reviews());
  return (
    <PageContent screen="A13">
      <h1 className="text-[28px] font-semibold text-ink">My reviews</h1>
      {!data ? (
        <NetworkError />
      ) : (
        <>
          <div role="status">
            {submitted ? (
              <StatusMessage title="Submission received / Pending">
                Your review is awaiting moderation. It is not yet visible on the product’s reviews page.
              </StatusMessage>
            ) : null}
          </div>
          <MyReviewsTable reviews={data.reviews} />
          {data.awaiting.length > 0 ? (
            <section aria-labelledby="awaiting-title" className={panel}>
              <h2 id="awaiting-title" className="text-base font-semibold">
                Delivered items awaiting your review
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {data.awaiting.map((a) => (
                  <li key={`${a.orderId}-${a.sku}`}>
                    <Link href={`/account/orders/${encodeURIComponent(a.orderId)}/items/${encodeURIComponent(a.sku)}/review`} className="underline">
                      Write a review of {a.productName}
                    </Link>{" "}
                    · Order {a.orderId}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </PageContent>
  );
}
