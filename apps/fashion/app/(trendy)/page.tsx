import Image from "next/image";
import Link from "next/link";
import { categories, edit, imagePath, productPath } from "@/lib/trendy";
import { ProductCard } from "./product-card";

export default function Home() {
  return (
    <>
      <section className="tl-hero">
        <div className="hero-content">
          <div className="hero-inner">
            <p className="label hero-kicker">The Terrace Edit</p>
            <h1>
              From the stands
              <br />
              to the <em>streets.</em>
            </h1>
            <p>
              Football jerseys, retro runners and sharp accessories. Style the whole fit from one
              drop.
            </p>
            <Link className="tl-button accent" href="/collection">
              Shop the drop
            </Link>
          </div>
        </div>
        <div className="tl-hero-photo">
          <Image
            src={imagePath("terrace-look")}
            alt="Model in a forest-green football jersey and charcoal cargos"
            fill
            preload
            unoptimized
          />
        </div>
      </section>
      <section className="frame tl-section" aria-labelledby="drop-title">
        <div className="section-head">
          <div>
            <p className="label">The latest drop</p>
            <h2 id="drop-title">Shop the edit</h2>
          </div>
          <Link className="text-link" href="/collection">
            View all products
          </Link>
        </div>
        <nav className="home-categories" aria-label="Shop by category">
          {categories.map(({ name, slug }) => (
            <Link key={slug} href={`/collection?category=${slug}`}>
              {name}
            </Link>
          ))}
        </nav>
        <div className="tl-grid">
          {edit.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
      <section id="the-edit" className="frame tl-section lookbook" aria-labelledby="look-title">
        <Image
          src={imagePath("terrace-editorial")}
          alt="A styled look pairing the Terrace Jersey with the Utility Cargo"
          width={800}
          height={780}
          unoptimized
        />
        <div className="look-copy">
          <p className="label">The lookbook</p>
          <h2 id="look-title">The whole fit.</h2>
          <p>
            Start with the Terrace Jersey. Add a loose charcoal cargo, a low-profile runner and slim
            black frames.
          </p>
          <Link className="tl-button" href={productPath("terrace-jersey") + "#complete-the-look"}>
            Shop the look
          </Link>
        </div>
      </section>
    </>
  );
}
