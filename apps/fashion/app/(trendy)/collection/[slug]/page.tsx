import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { availableStock } from "@/lib/orders";
import { edit, relatedProducts, salesNumber, trendyVariantId } from "@/lib/trendy";
import { ProductOrder } from "../../ordering";
import { ProductCard } from "../../product-card";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return edit.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = edit.find((item) => item.slug === slug);
  return { title: product?.name ?? "Style unavailable", description: product?.description };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = edit.find((item) => item.slug === slug);
  if (!product) notFound();
  const recommendations = relatedProducts(product);
  let detail = product;
  if (product.price > 0 && process.env.DATABASE_URL) {
    await connection();
    const stock = await availableStock(
      product.colours.flatMap(({ name }) =>
        product.sizes.map((size) => trendyVariantId(slug, name, size)),
      ),
    );
    detail = {
      ...product,
      colours: product.colours.map((colour) => ({
        ...colour,
        stock: product.sizes.map(
          (size) => stock.get(trendyVariantId(slug, colour.name, size)) ?? 0,
        ),
      })),
    };
  }
  return (
    <div className="frame inner-page">
      <Link className="text-link breadcrumb" href="/collection">
        Shop the collection
      </Link>
      <ProductOrder key={product.slug} product={detail} number={salesNumber()} />
      <section className="tl-section" id="complete-the-look" aria-labelledby="look-title">
        <div className="section-head">
          <h2 id="look-title">Complete the look</h2>
        </div>
        <div className="tl-grid related-grid">
          {recommendations.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
