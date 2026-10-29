import Link from "next/link";
import { ReviewForm } from "@/components/account/ReviewForm";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { panel } from "@/components/ui/styles";
import { loadAccountData, requireCustomerPage } from "@/lib/api/account";

type Props = { params: Promise<{ id: string; sku: string }> };

/**
 * A13 write / edit for one delivered order line. The order must be the
 * customer's (404 otherwise); not delivered or not bought means writing
 * is disabled, with links to the order and the product's reviews.
 */
export default async function WriteReviewPage({ params }: Props) {
  const { id, sku } = await params;
  const returnTo = `/account/orders/${encodeURIComponent(id)}/items/${encodeURIComponent(sku)}/review`;
  await requireCustomerPage(returnTo);
  const view = await loadAccountData(returnTo, (api) => api.account.reviewForm(id, sku));
  return (
    <PageContent screen="A13">
      <h1 className="text-[28px] font-semibold text-ink">My reviews</h1>
      {!view ? (
        <NetworkError />
      ) : view.status === "eligible" ? (
        <div className="md:max-w-[640px]">
          <ReviewForm view={view} />
        </div>
      ) : (
        <section aria-labelledby="ineligible-title" className={`${panel} md:max-w-[640px]`}>
          <h2 id="ineligible-title" className="text-base font-semibold">
            Writing a review isn’t available for this item
          </h2>
          <p className="text-sm">
            {view.reason === "not-delivered"
              ? "You can review an item once its order has been delivered."
              : "You can only review items you bought in this order."}
          </p>
          <p className="flex flex-wrap gap-2 text-sm">
            <Link href={`/account/orders/${encodeURIComponent(view.orderId)}`} className="underline">
              View order
            </Link>
            {view.productSlug ? (
              <>
                <span aria-hidden="true">·</span>
                <Link href={`/products/${view.productSlug}/reviews`} className="underline">
                  Browse reviews
                </Link>
              </>
            ) : null}
          </p>
        </section>
      )}
    </PageContent>
  );
}
