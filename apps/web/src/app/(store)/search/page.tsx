import Link from "next/link";
import { redirect } from "next/navigation";
import { listingQueryToParams, parseListingQuery, type ListingQuery } from "@your-app/shared";
import { ListingPage } from "@/components/storefront/listing/ListingPage";
import { fieldBox, fieldLabel, primaryButton, textLink } from "@/components/ui/styles";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** "Search query" box. A new search keeps the current facets and starts at page 1. */
function SearchQueryForm({ query }: { query: ListingQuery }) {
  const keep = listingQueryToParams({ ...query, q: "", page: 1 });
  return (
    <form action="/search" role="search" className={`${fieldBox} flex-row flex-wrap items-end gap-3`}>
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor="search-query" className={fieldLabel}>
          Search query
        </label>
        <input
          id="search-query"
          name="q"
          type="search"
          defaultValue={query.q}
          className="border border-line p-1.5"
        />
      </div>
      {[...keep.entries()].map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={primaryButton}>
        Search
      </button>
      <Link href="/" className={`${textLink} self-center`}>
        Clear search
      </Link>
    </form>
  );
}

/** C04 Search results: the C03 listing module with q preserved alongside every facet. */
export default async function SearchPage({ searchParams }: Props) {
  const query = parseListingQuery(await searchParams);
  // Clearing the search returns to C01.
  if (!query.q) redirect("/");
  return (
    <ListingPage
      basePath="/search"
      category={null}
      query={query}
      title={() => "Search results"}
      crumbs={() => [{ label: "Home", href: "/" }, { label: "Search" }]}
      searchBox={<SearchQueryForm query={query} />}
    />
  );
}
