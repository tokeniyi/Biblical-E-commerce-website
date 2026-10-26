import { parseListingQuery } from "@your-app/shared";
import { ListingPage } from "@/components/storefront/listing/ListingPage";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** C03 Browse Bibles. `/categories/bibles` is All Bibles; other slugs narrow it. */
export default async function BrowsePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = parseListingQuery(await searchParams);
  return (
    <ListingPage
      basePath={`/categories/${slug}`}
      category={slug}
      // Search text belongs to C04; a category URL ignores it.
      query={{ ...query, q: "" }}
      title={(result) => (result?.category && result.category.slug !== "bibles" ? result.category.name : "Browse Bibles")}
      crumbs={(result) => [
        { label: "Home", href: "/" },
        { label: "Categories", href: "/categories" },
        { label: result?.category?.name ?? "Bibles" },
      ]}
    />
  );
}
