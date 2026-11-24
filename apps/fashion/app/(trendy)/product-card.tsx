import Image from "next/image";
import Link from "next/link";
import { money } from "@/lib/catalog";
import { categoryName, imagePath, productPath, type Product } from "@/lib/trendy";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="tl-card">
      <Link href={productPath(product.slug)} className="tl-card-link">
        <div className="tl-card-photo">
          <Image
            src={imagePath(product.colours[0].photo)}
            alt=""
            width={560}
            height={560}
            unoptimized
          />
        </div>
        <div className="tl-card-copy">
          <p className="label">{categoryName(product.category)}</p>
          <h3>{product.name}</h3>
          <p className="tl-card-price">
            {product.terms === "enquiry" ? "Price on request" : money(product.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
