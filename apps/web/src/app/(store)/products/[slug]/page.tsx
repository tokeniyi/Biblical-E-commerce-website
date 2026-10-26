import Link from "next/link";
import { notFound } from "next/navigation";
import type { CartView, ProductDetail } from "@your-app/shared";
import { PageContent } from "@/components/shell/StorefrontShell";
import { Breadcrumbs } from "@/components/storefront/Breadcrumbs";
import { NetworkError } from "@/components/storefront/NetworkError";
import { ProductPurchase } from "@/components/storefront/product/ProductPurchase";
import { formatReviewDate, stars } from "@/components/storefront/reviews/ReviewLines";
import { panel, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { loadViewer } from "@/lib/api/viewer";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EMPTY_CART: CartView = { lines: [], saved: [], itemCount: 0, subtotalCents: 0 };

async function loadProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await (await serverApi()).catalog.getProduct(slug);
  } catch (error) {
    // Unknown and draft products: E19, without saying which.
    if (error instanceof ApiError && error.code === "not_found") notFound();
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

async function loadCart(): Promise<CartView> {
  try {
    return await (await serverApi()).cart.get();
  } catch {
    return EMPTY_CART;
  }
}

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

/** C05 Product & variant; C07 is its `?cart=added` drawer state. */
export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const [detail, viewer, cart] = await Promise.all([loadProduct(slug), loadViewer(), loadCart()]);

  if (!detail) {
    return (
      <PageContent screen="C05">
        <h1 className="text-[28px] font-semibold text-ink">Bible details</h1>
        <NetworkError />
      </PageContent>
    );
  }

  const { product, category, topReview } = detail;
  const reviewsHref = `/products/${product.slug}/reviews`;

  return (
    <PageContent screen="C05">
      <h1 className="text-[28px] font-semibold text-ink">{product.name}</h1>
      <Breadcrumbs
        crumbs={[
          { label: "Home", href: "/" },
          ...(category ? [{ label: category.name, href: `/categories/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />
      <ProductPurchase
        product={product}
        category={category}
        initialSku={first(sp.variant)}
        cart={cart}
        drawerOpen={first(sp.cart) === "added"}
        signedIn={viewer.kind === "customer"}
        wishlist={viewer.kind === "customer" ? viewer.wishlist : []}
        description={
          <section aria-labelledby="description-heading" className={panel}>
            <h2 id="description-heading" className="text-base font-semibold">
              Description
            </h2>
            <p className="text-sm leading-snug">{product.description}</p>
          </section>
        }
        reviews={
          <section aria-labelledby="reviews-heading" className={panel}>
            <h2 id="reviews-heading" className="text-base font-semibold">
              Customer reviews
            </h2>
            {topReview ? (
              <div className="text-sm leading-snug">
                <p>
                  <span aria-label={`${String(topReview.rating)} out of 5 stars`}>{stars(topReview.rating)}</span> “
                  {topReview.title}.”
                </p>
                <p>
                  {topReview.authorName}
                  {topReview.verifiedPurchase ? " · Verified purchase" : ""}
                </p>
                <p>
                  Helpful ({topReview.helpfulCount}) · Posted {formatReviewDate(topReview.createdAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm">No reviews yet.</p>
            )}
            <Link href={reviewsHref} className={`${secondaryButton} self-start`}>
              Read all reviews
            </Link>
          </section>
        }
      />
    </PageContent>
  );
}
