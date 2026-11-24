import Image from "next/image";
import Link from "next/link";
import { money } from "@/lib/catalog";
import { imagePath, productPath, type Product } from "@/lib/trendy";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="tl-card">
      <Link href={productPath(product.slug)} className="tl-card-link">
        <div className="tl-card-photo">
          <Image
            src={imagePath(product.colours[0].photo)}
            alt=""
            width={228}
            height={282}
            unoptimized
          />
        </div>
        <div className="tl-card-copy">
          <p className="label">{product.kind}</p>
          <h3>{product.name}</h3>
          <p className="tl-card-price">
            {product.terms === "enquiry" ? "Price on request" : money(product.price)}
          </p>
          {product.colours.length > 1 && (
            <div className="card-colours" aria-label={`${product.colours.length} colours shown`}>
              {product.colours.map(({ name, swatch }) => (
                <span key={name} style={{ background: swatch }} title={name} />
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
