import { notFound } from "next/navigation";
import { products } from "@/lib/catalog";
import { productStock } from "@/lib/orders";
import { ProductPurchase } from "../../shopper";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: products.find((product) => product.slug === slug)?.name ?? "Style unavailable" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const stock = await productStock(slug);
  return <ProductPurchase product={product} stock={stock} />;
}
