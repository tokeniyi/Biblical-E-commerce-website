import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { ListingQuery, ListingResponse } from "@your-app/shared";
import { PageContent } from "@/components/shell/StorefrontShell";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { loadViewer } from "@/lib/api/viewer";
import { Breadcrumbs, type Crumb } from "../Breadcrumbs";
import { LoadingGrid } from "../LoadingGrid";
import { NetworkError } from "../NetworkError";
import { ProductCard, ProductGrid } from "../ProductCard";
import { FALLBACK_BINDINGS, FALLBACK_TRANSLATIONS, FilterSidebar } from "./FilterSidebar";
import { ListingProvider, ListingResults } from "./ListingContext";
import { ActiveFilters, NoResults, Pagination, SoldOutHint, SortSelect } from "./ListingControls";

type ListingPageProps = {
  basePath: string;
  /** C03 category slug, or null for search (C04). */
  category: string | null;
  query: ListingQuery;
  title: (result: ListingResponse | null) => string;
  crumbs: (result: ListingResponse | null) => Crumb[];
  /** C04's "Search query" box, above the filters. */
  searchBox?: ReactNode;
};

/** null = network failure (E18); not_found → 404 (E19); anything else is a real bug and throws. */
async function loadListing(category: string | null, query: ListingQuery): Promise<ListingResponse | null> {
  try {
    return await (await serverApi()).catalog.listProducts(category, query);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") notFound();
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

function countLabel(result: ListingResponse): string {
  const { total, query } = result;
  if (query.q) return `${String(total)} ${total === 1 ? "result" : "results"} for “${query.q}”`;
  const noun = total === 1 ? "Bible" : "Bibles";
  return query.availability === "in-stock" ? `${String(total)} ${noun} in stock` : `${String(total)} ${noun}`;
}

/** The listing module shared by C03 (category) and C04 (search). */
export async function ListingPage({ basePath, category, query, title, crumbs, searchBox }: ListingPageProps) {
  const [result, viewer] = await Promise.all([loadListing(category, query), loadViewer()]);
  // The server may clamp the page; controls should reflect what is shown.
  const shown = result?.query ?? query;

  return (
    <PageContent screen={category === null ? "C04" : "C03"}>
      <h1 className="text-[28px] font-semibold text-ink">{title(result)}</h1>
      <Breadcrumbs crumbs={crumbs(result)} />
      {searchBox}
      <ListingProvider basePath={basePath} query={shown}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <FilterSidebar
            translations={result?.translations ?? FALLBACK_TRANSLATIONS}
            bindings={result?.bindings ?? FALLBACK_BINDINGS}
          />
          <ListingResults loading={<LoadingGrid />}>
            {result === null ? (
              <NetworkError />
            ) : result.total === 0 ? (
              <NoResults isSearch={category === null} />
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <p role="status" className="flex-1 text-base font-semibold">
                    {countLabel(result)}
                  </p>
                  <SortSelect />
                </div>
                <ActiveFilters />
                <ProductGrid>
                  {result.items.map((item) => (
                    <ProductCard key={item.slug} item={item} viewer={viewer} />
                  ))}
                </ProductGrid>
                <Pagination result={result} noun={category === null ? "results" : "Bibles"} />
                {result.soldOutExample ? <SoldOutHint example={result.soldOutExample} /> : null}
              </>
            )}
          </ListingResults>
        </div>
      </ListingProvider>
    </PageContent>
  );
}
