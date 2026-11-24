import Image from "next/image";
import Link from "next/link";
import { categories, edit, featured, imagePath, productPath } from "@/lib/trendy";
import { ProductCard } from "./product-card";

const categoryPhotos = {
  clothing: "embroidered-scenic-jacket",
  footwear: "layered-panel-sneakers",
  accessories: "tan-graphic-holdall",
};

const looks = [
  {
    photo: "look-tailored",
    name: "After dark",
    alt: "Dark polo and trousers styled with a tan bag",
    href: "/collection?type=bags",
  },
  {
    photo: "look-cream",
    name: "Off-duty neutrals",
    alt: "Cream polo and trousers styled together",
    href: productPath("cream-zip-polo"),
  },
  {
    photo: "look-night",
    name: "Finishing touches",
    alt: "Dark jacket styled with sunglasses",
    href: "/collection?type=eyewear",
  },
  {
    photo: "look-weekend",
    name: "Weekend layers",
    alt: "Cream short-sleeve outfit and dark sneakers",
    href: "/collection?category=footwear",
  },
];

export default function Home() {
  const selected = featured.flatMap((slug) => edit.filter((product) => product.slug === slug));
  return (
    <>
      <section className="tl-hero">
        <div className="hero-content">
          <div className="hero-inner">
            <p className="label hero-kicker">The Street Style Edit</p>
            <h1>
              Streetwear,
              <br /> <em>styled your way.</em>
            </h1>
            <p>
              Graphic layers, statement sneakers and the accessories that pull the look together.
            </p>
            <Link className="tl-button accent" href="/collection">
              Shop the collection
            </Link>
          </div>
        </div>
        <div className="tl-hero-photo">
          <div className="hero-main">
            <Image
              src={imagePath("look-scenic")}
              alt="Streetwear look featuring a black scenic jacket"
              fill
              preload
              unoptimized
            />
          </div>
          <div className="hero-side">
            <Image
              src={imagePath("green-contrast-jersey")}
              alt="Green contrast-collar jersey styled with sunglasses"
              fill
              unoptimized
            />
          </div>
        </div>
      </section>
      <section className="frame tl-section" aria-labelledby="categories-title">
        <div className="section-head">
          <h2 id="categories-title">Shop by category</h2>
        </div>
        <div className="category-tiles">
          {categories.map(({ name, slug }) => (
            <Link key={slug} href={`/collection?category=${slug}`}>
              <Image
                src={imagePath(categoryPhotos[slug])}
                alt=""
                width={228}
                height={282}
                unoptimized
              />
              <span>{name}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="frame tl-section" aria-labelledby="drop-title">
        <div className="section-head">
          <h2 id="drop-title">Featured styles</h2>
          <Link className="text-link" href="/collection">
            View all products
          </Link>
        </div>
        <div className="tl-grid">
          {selected.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
      <section id="the-edit" className="frame tl-section" aria-labelledby="look-title">
        <div className="section-head">
          <h2 id="look-title">From the lookbook</h2>
        </div>
        <div className="editorial-grid">
          {looks.map(({ photo, name, alt, href }) => (
            <Link key={photo} href={href}>
              <Image src={imagePath(photo)} alt={alt} width={228} height={282} unoptimized />
              <span>{name}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
