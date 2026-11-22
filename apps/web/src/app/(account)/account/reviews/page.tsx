import Link from "next/link";
import { PageContent } from "@/components/shell/StorefrontShell";
import { Stars } from "@/components/ui/Icon";
import { badge, pageHeading, panel } from "@/components/ui/styles";
import { formatDate } from "@/components/account/OrderStatus";
import { requireCustomerPage } from "@/lib/api/account";

export const metadata = { title: "Your reviews" };

/** A13 list: the customer's own reviews, including pending ones. */
export default async function ReviewsPage() {
  const { api } = await requireCustomerPage("/account/reviews");
  const { reviews } = await api.account.profile();
  return (
    <PageContent screen="A13">
      <h1 className={pageHeading}>Your reviews</h1>
      {reviews.length === 0 ? (
        <p className={panel}>You haven’t written any reviews yet. Delivered items can be reviewed from your orders.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className={panel}>
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={r.rating} />
                <span className="sr-only">{r.rating} out of 5</span>
                <span className={`${badge} ${r.status === "published" ? "bg-success/10 text-success" : "bg-gold-soft text-warning"}`}>
                  {r.status === "published" ? "Published" : "Pending moderation"}
                </span>
              </div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-muted">
                {formatDate(r.createdAt)} ·{" "}
                <Link href={`/products/${r.productSlug}`} className="underline">
                  View product
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageContent>
  );
}
