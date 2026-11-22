import Link from "next/link";
import { DEFAULT_LISTING_QUERY, formatCents, type ListingResponse, type ProductDetail } from "@your-app/shared";
import { PageContent } from "@/components/shell/StorefrontShell";
import { BookCover } from "@/components/storefront/BookCover";
import { NetworkError } from "@/components/storefront/NetworkError";
import { ProductCard, ProductGrid } from "@/components/storefront/ProductCard";
import { CategoryArt, HeroArt } from "@/components/storefront/SceneArt";
import { Icon, Stars, type IconName } from "@/components/ui/Icon";
import { displayHeading, eyebrow, primaryButton, secondaryButton, textLink } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { loadViewer } from "@/lib/api/viewer";

/** Category tiles; each opens the listing template for its slug. */
const CATEGORY_TILES = [
  { slug: "study", name: "Study Bibles", blurb: "Notes, maps and cross-references for deeper study." },
  { slug: "devotional", name: "Devotional Bibles", blurb: "Everyday reading editions for quiet time." },
  { slug: "children", name: "Children’s Bibles", blurb: "Readable translations for young readers." },
  { slug: "large-print", name: "Large Print", blurb: "Bigger type for comfortable reading." },
] as const;

const VALUE_PROPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "book", title: "Compare editions", body: "Translation, binding and print size side by side." },
  { icon: "truck", title: "Delivery from $5", body: "Standard or express, with dates shown before you pay." },
  { icon: "rotate", title: "30-day returns", body: "Unopened items, refunded to your original payment." },
  { icon: "shield", title: "Secure checkout", body: "Guest checkout, no account required." },
];

const TRANSLATIONS = [
  { code: "ESV", name: "English Standard Version", note: "Word-for-word, readable. Popular for study." },
  { code: "NIV", name: "New International Version", note: "Balanced thought-for-thought. Great for everyday reading." },
  { code: "KJV", name: "King James Version", note: "Classic 1611 language, loved for memorisation." },
  { code: "NLT", name: "New Living Translation", note: "Clear, contemporary English. Ideal for new readers." },
] as const;

/** Popular Bibles = the first page of All Bibles in relevance order. */
async function loadPopular(): Promise<ListingResponse | null> {
  try {
    return await (await serverApi()).catalog.listProducts("bibles", DEFAULT_LISTING_QUERY);
  } catch (error) {
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

async function loadSpotlight(): Promise<ProductDetail | null> {
  try {
    return await (await serverApi()).catalog.getProduct("esv-study-bible");
  } catch {
    return null;
  }
}

/** C01 Home. Public; the cart stays guest-accessible. */
export default async function HomePage() {
  const [popular, viewer, spotlight] = await Promise.all([loadPopular(), loadViewer(), loadSpotlight()]);
  const spotlightVariant = spotlight?.product.variants.find((v) => v.status === "published");

  return (
    <PageContent screen="C01">
      {/* Hero */}
      <section
        aria-labelledby="hero-heading"
        className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-card md:grid-cols-[1.05fr_1fr]"
      >
        <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
          <p className={eyebrow}>Find a Bible for every reading journey</p>
          <h1 id="hero-heading" className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            The Bible you’ll reach for every day.
          </h1>
          <p className="max-w-md text-base text-muted">
            Compare study editions, everyday reading Bibles and gifts. Choose translation, binding and print size before
            adding to cart.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/categories/study" className={primaryButton} data-track="hero-shop-study">
              Shop study Bibles <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link href="/categories" className={secondaryButton} data-track="hero-browse-categories">
              Browse categories
            </Link>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Stars value={4.8} />
            <span>Rated 4.8/5 by 124 ESV Study Bible readers</span>
          </p>
        </div>
        <div className="relative min-h-64 bg-gold-soft">
          <HeroArt className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* Value props */}
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Why shop with us">
        {VALUE_PROPS.map((v) => (
          <li key={v.title} className="flex items-start gap-3 rounded-2xl bg-white/60 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon name={v.icon} />
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-ink">{v.title}</span>
              <span className="text-muted">{v.body}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>Shop by purpose</p>
            <h2 id="categories-heading" className={displayHeading}>
              Shop by category
            </h2>
          </div>
          <Link href="/categories" className={textLink}>
            All categories
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_TILES.map((tile) => (
            <li key={tile.slug} className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-lift">
              <CategoryArt slug={tile.slug} className="h-40 w-full transition-transform duration-300 group-hover:scale-[1.03]" />
              <div className="flex flex-col gap-1 p-4">
                <h3 className="font-display text-lg font-semibold text-ink">{tile.name}</h3>
                <p className="text-sm text-muted">{tile.blurb}</p>
                <Link
                  href={`/categories/${tile.slug}`}
                  aria-label={`Browse ${tile.name}`}
                  data-track={`category-tile-${tile.slug}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand after:absolute after:inset-0 after:content-['']"
                >
                  Browse <Icon name="chevronRight" className="h-4 w-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Popular */}
      <section aria-labelledby="popular-heading" className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>Bestsellers</p>
            <h2 id="popular-heading" className={displayHeading}>
              Popular Bibles
            </h2>
          </div>
          <Link href="/categories/bibles" className={textLink}>
            Shop all Bibles
          </Link>
        </div>
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

      {/* Translation guide */}
      <section aria-labelledby="translations-heading" className="rounded-3xl bg-ink p-8 text-white sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Not sure which translation?</p>
        <h2 id="translations-heading" className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          Find your translation
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRANSLATIONS.map((t) => (
            <li key={t.code} className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/5 p-5">
              <span className="font-display text-2xl font-semibold text-gold">{t.code}</span>
              <span className="text-sm font-semibold">{t.name}</span>
              <span className="text-sm text-white/75">{t.note}</span>
              <Link
                href={`/categories/bibles?translation=${t.code}`}
                className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-white underline-offset-4 hover:underline"
                data-track={`translation-${t.code}`}
              >
                Shop {t.code} <Icon name="chevronRight" className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Spotlight */}
      {spotlight && spotlightVariant ? (
        <section aria-labelledby="spotlight-heading" className="grid items-center gap-8 rounded-3xl border border-line bg-white p-6 shadow-card md:grid-cols-[280px_1fr] md:p-10">
          <BookCover
            title={spotlight.product.name}
            translation={spotlightVariant.translation}
            binding={spotlightVariant.binding}
            sizeClass="aspect-[3/4] max-w-[280px]"
          />
          <div className="flex flex-col gap-4">
            <p className={eyebrow}>Editor’s pick</p>
            <h2 id="spotlight-heading" className={displayHeading}>
              {spotlight.product.name}
            </h2>
            <p className="text-muted">{spotlight.product.description}</p>
            {spotlight.product.rating ? (
              <p className="flex items-center gap-2 text-sm">
                <Stars value={spotlight.product.rating.average} />
                {spotlight.product.rating.average} out of 5 · {spotlight.product.rating.count} reviews
              </p>
            ) : null}
            <blockquote className="border-l-4 border-gold pl-4 font-display text-lg italic text-ink">
              “The notes make difficult passages easier to understand.”
              <footer className="mt-1 font-sans text-sm not-italic text-muted">Taylor M. · Verified purchase</footer>
            </blockquote>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/products/${spotlight.product.slug}?variant=${encodeURIComponent(spotlightVariant.sku)}`}
                className={primaryButton}
                data-track="spotlight-view"
              >
                View edition · {formatCents(spotlightVariant.priceCents)}
              </Link>
              <Link href={`/products/${spotlight.product.slug}/reviews`} className={textLink}>
                Read reviews
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </PageContent>
  );
}
