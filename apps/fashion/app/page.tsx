import Image from "next/image";
import Link from "next/link";
import { money, products } from "@/lib/catalog";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">The Linen Edit</p>
            <h1>
              Linen for
              <br />
              everyday.
            </h1>
            <p>
              Easy silhouettes in breathable linen, from the first shirt you reach for to the dress
              you wear on repeat.
            </p>
            <Link className="button" href="#collection">
              Shop the collection
            </Link>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/linen-edit.webp"
            alt="Model wearing the chalk linen dress in a warm plaster studio"
            width={950}
            height={900}
            unoptimized
            preload
          />
        </div>
      </section>
      <section className="shell collection" id="collection" aria-labelledby="collection-title">
        <div className="collection-heading">
          <h2 id="collection-title">Shop the edit</h2>
          <span>{products.length} styles</span>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.slug}>
              <Link href={`/shop/${product.slug}`} className="card-link">
                <div className="card-image">
                  <Image
                    src={product.colours[0].image}
                    alt=""
                    width={750}
                    height={900}
                    unoptimized
                  />
                </div>
                <div className="card-title">
                  <h3>{product.name}</h3>
                  <span>{money(product.price)}</span>
                </div>
              </Link>
              <div
                className="card-colours"
                aria-label={product.colours.map((colour) => colour.name).join(", ")}
                role="img"
              >
                {product.colours.map((colour) => (
                  <span key={colour.code} title={colour.name} style={{ background: colour.hex }} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
