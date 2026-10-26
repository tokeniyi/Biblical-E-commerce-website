import Link from "next/link";
import { DEFAULT_LISTING_QUERY, type ListingResponse } from "@your-app/shared";
import { PageContent } from "@/components/shell/StorefrontShell";
import { BookCover } from "@/components/storefront/BookCover";
import { NetworkError } from "@/components/storefront/NetworkError";
import { ProductCard, ProductGrid } from "@/components/storefront/ProductCard";
import { fieldBox, fieldLabel, panel, primaryButton, secondaryButton, textLink } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { loadViewer } from "@/lib/api/viewer";

/** C01 category tiles; each opens the C03 template for its slug. */
const CATEGORY_TILES = [
  { slug: "study", name: "Study Bibles" },
  { slug: "devotional", name: "Devotional Bibles" },
  { slug: "children", name: "Children’s Bibles" },
  { slug: "large-print", name: "Large Print" },
] as const;

/** Popular Bibles = the first page of All Bibles in relevance order, as drawn. */
async function loadPopular(): Promise<ListingResponse | null> {
  try {
    return await (await serverApi()).catalog.listProducts("bibles", DEFAULT_LISTING_QUERY);
  } catch (error) {
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

/** C01 Home. Public; the cart stays guest-accessible. */
export default async function HomePage() {
  const [popular, viewer] = await Promise.all([loadPopular(), loadViewer()]);
  const featured = popular?.items.at(0);

  return (
    <PageContent screen="C01">
      <h1 className="text-[28px] font-semibold text-ink">Home</h1>

      <div className="flex flex-col gap-4 md:flex-row">
        <section aria-labelledby="hero-heading" className={`${panel} flex-1`}>
          <p className="text-base font-semibold">Find a Bible for every reading journey</p>
          <h2 id="hero-heading" className="text-2xl font-semibold">
            Browse by translation, purpose or reader.
          </h2>
          <p className="text-base">
            Compare study editions, everyday reading Bibles and gifts. Choose translation, binding and print size before
            adding to cart.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/categories" className={primaryButton}>
              Browse categories
            </Link>
            <Link href="/categories/study" className={textLink}>
              Shop study Bibles
            </Link>
          </div>
        </section>
        <div className="flex w-full flex-col gap-4 md:w-[340px]">
          <BookCover label="Featured Bible selection" heightClass="h-[188px]" />
          <p className="text-sm text-muted">
            Schematic featured product /{" "}
            {featured ? (
              <Link href={`/products/${featured.slug}?variant=${encodeURIComponent(featured.variant.sku)}`} className="underline">
                {featured.name}
              </Link>
            ) : (
              "ESV Study Bible"
            )}
          </p>
        </div>
      </div>

      <form action="/search" role="search" className={`${fieldBox} flex-row flex-wrap items-end gap-3`}>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label htmlFor="home-search" className={fieldLabel}>
            Find a Bible
          </label>
          <input
            id="home-search"
            name="q"
            type="search"
            placeholder="Search title, translation or ISBN…"
            className="border border-line p-1.5"
          />
        </div>
        <button type="submit" className={secondaryButton}>
          Search
        </button>
      </form>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <h2 id="categories-heading" className="text-base font-semibold">
          Shop by category
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_TILES.map((tile) => (
            <li key={tile.slug} className={panel}>
              <h3 className="text-base font-semibold">{tile.name}</h3>
              <Link
                href={`/categories/${tile.slug}`}
                className={`${secondaryButton} self-start`}
                aria-label={`Browse ${tile.name}`}
              >
                Browse
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="popular-heading" className="flex flex-col gap-4">
        <h2 id="popular-heading" className="text-base font-semibold">
          Popular Bibles
        </h2>
        {popular ? (
          <ProductGrid>
            {popular.items.map((item) => (
              <ProductCard key={item.slug} item={item} viewer={viewer} />
            ))}
          </ProductGrid>
        ) : (
          <NetworkError />
        )}
      </section>
    </PageContent>
  );
}
