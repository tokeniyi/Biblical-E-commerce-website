"use client";

import Link from "next/link";
import { useId } from "react";
import {
  clearListingFilters,
  formatCents,
  updateListingQuery,
  type ListingQuery,
  type ListingResponse,
} from "@your-app/shared";
import { fieldBox, fieldLabel, primaryButton, statusBox, textLink } from "@/components/ui/styles";
import { BIBLE_TYPES } from "./FilterSidebar";
import { ListingLink, useListing } from "./ListingContext";

const SORT_OPTIONS: { value: ListingQuery["sort"]; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
  { value: "rating", label: "Rating" },
  { value: "newest", label: "Newest" },
];

/** Sort keeps every filter and returns to page 1 (C04: "Sort does not remove filters"). */
export function SortSelect() {
  const { query, navigate } = useListing();
  const id = useId();
  return (
    <div className={`${fieldBox} w-full sm:w-[min(100%,390px)]`}>
      <label htmlFor={id} className={fieldLabel}>
        Sort by
      </label>
      <select
        id={id}
        value={query.sort}
        onChange={(e) => {
          navigate(updateListingQuery(query, { sort: e.target.value as ListingQuery["sort"] }));
        }}
        className="border border-line bg-white p-1"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type Chip = { label: string; without: ListingQuery };

/** Removable chips for every active filter, including the English / In stock defaults. */
export function activeChips(query: ListingQuery): Chip[] {
  const chips: Chip[] = [];
  const without = (patch: Partial<ListingQuery>) => updateListingQuery(query, patch);
  if (query.language !== "all") {
    chips.push({ label: query.language === "en" ? "English" : "Spanish", without: without({ language: "all" }) });
  }
  if (query.availability === "in-stock") chips.push({ label: "In stock", without: without({ availability: "all" }) });
  for (const t of query.translation) {
    chips.push({ label: t, without: without({ translation: query.translation.filter((x) => x !== t) }) });
  }
  for (const t of query.type) {
    const label = BIBLE_TYPES.find((b) => b.value === t)?.label ?? t;
    chips.push({ label, without: without({ type: query.type.filter((x) => x !== t) }) });
  }
  if (query.binding) chips.push({ label: query.binding, without: without({ binding: null }) });
  if (query.priceMin !== null || query.priceMax !== null) {
    const label = `$${String(query.priceMin ?? 0)} — ${query.priceMax === null ? "any" : `$${String(query.priceMax)}`}`;
    chips.push({ label, without: without({ priceMin: null, priceMax: null }) });
  }
  if (query.largePrint) chips.push({ label: "Large print", without: without({ largePrint: false }) });
  return chips;
}

function ChipList({ chips }: { chips: Chip[] }) {
  return (
    <ul className="flex flex-wrap gap-x-1 gap-y-1">
      {chips.map((chip, i) => (
        <li key={chip.label} className="flex items-center gap-1">
          {i > 0 ? <span aria-hidden="true">·</span> : null}
          <ListingLink to={chip.without} aria-label={`Remove filter: ${chip.label}`} className="hover:underline">
            {chip.label} ×
          </ListingLink>
        </li>
      ))}
    </ul>
  );
}

export function ActiveFilters() {
  const { query } = useListing();
  const chips = activeChips(query);
  if (chips.length === 0) return null;
  return (
    <div className={statusBox}>
      <div className="flex flex-wrap items-center gap-1 text-base font-semibold">
        <span>Active filters:</span>
        <ChipList chips={chips} />
      </div>
      <p className="text-sm">
        Remove a chip to update results.{" "}
        <ListingLink to={clearListingFilters(query)} className="underline">
          Clear all
        </ListingLink>
        . Filters and page are shareable in the URL.
      </p>
    </div>
  );
}

/** "Showing 1–3 of 24 Bibles · 3 per page" and "‹ Previous [1] 2 3 Next ›". */
export function Pagination({ result, noun }: { result: ListingResponse; noun: string }) {
  const { query } = useListing();
  const { page, pageCount, pageSize, total } = result;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const start = Math.max(1, Math.min(page - 1, pageCount - 2));
  const pages = Array.from({ length: Math.min(3, pageCount) }, (_, i) => start + i);
  const to = (p: number) => updateListingQuery(query, { page: p });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted">
        Showing {first}–{last} of {total} {noun} · {pageSize} per page
      </p>
      {pageCount > 1 ? (
        <nav aria-label="Pagination">
          <ul className="flex items-center gap-4">
            <li>
              {page > 1 ? (
                <ListingLink to={to(page - 1)} scroll>
                  ‹ Previous
                </ListingLink>
              ) : (
                <span aria-disabled="true" className="text-muted">
                  ‹ Previous
                </span>
              )}
            </li>
            {pages.map((p) => (
              <li key={p}>
                {p === page ? (
                  <ListingLink to={to(p)} aria-current="page" aria-label={`Page ${String(p)}, current`} className="font-semibold">
                    [{p}]
                  </ListingLink>
                ) : (
                  <ListingLink to={to(p)} scroll aria-label={`Page ${String(p)}`}>
                    {p}
                  </ListingLink>
                )}
              </li>
            ))}
            <li>
              {page < pageCount ? (
                <ListingLink to={to(page + 1)} scroll>
                  Next ›
                </ListingLink>
              ) : (
                <span aria-disabled="true" className="text-muted">
                  Next ›
                </span>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

/** C03: "Looking for NLT Children’s Bible ($22.00)? Clear “In stock” to include sold-out editions." */
export function SoldOutHint({ example }: { example: NonNullable<ListingResponse["soldOutExample"]> }) {
  const { query } = useListing();
  return (
    <p className="text-sm text-muted">
      Looking for {example.name} ({formatCents(example.priceCents)})?{" "}
      <ListingLink to={updateListingQuery(query, { availability: "all" })} className="underline">
        Clear “In stock”
      </ListingLink>{" "}
      to include sold-out editions.
    </p>
  );
}

/** E02 No search results. Keeps the query and facets visible; clearing never erases the query. */
export function NoResults({ isSearch }: { isSearch: boolean }) {
  const { query } = useListing();
  const chips = activeChips(query);
  return (
    <section aria-labelledby="no-results-heading" data-state="E02" className="flex flex-col gap-3.5">
      <h2 id="no-results-heading" className="text-2xl font-semibold">
        No Bibles match your search
      </h2>
      <p className="text-base">Try a broader query or remove filters.</p>
      <div className={fieldBox}>
        <p className={fieldLabel}>Active query / filters</p>
        <div className="flex flex-wrap items-center gap-1">
          {query.q ? (
            <span>
              {query.q}
              {chips.length > 0 ? " ·" : ""}
            </span>
          ) : null}
          <ChipList chips={chips} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ListingLink to={clearListingFilters(query)} className={primaryButton}>
          Clear filters
        </ListingLink>
        {isSearch ? (
          <a href="#search-query" className={textLink}>
            Edit search
          </a>
        ) : (
          <a href="#site-search" className={textLink}>
            Search Bibles
          </a>
        )}
        <span aria-hidden="true">·</span>
        <Link href="/categories" className={textLink}>
          Categories
        </Link>
      </div>
    </section>
  );
}
