"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clearListingFilters, updateListingQuery, type ListingQuery } from "@your-app/shared";
import { fieldBox, fieldLabel, secondaryButton } from "@/components/ui/styles";
import { useListing } from "./ListingContext";

/** Bible types drawn in the C03 sidebar (product category slugs). */
export const BIBLE_TYPES = [
  { value: "study", label: "Study" },
  { value: "devotional", label: "Devotional" },
  { value: "children", label: "Children" },
] as const;

/** Used when the listing failed to load (E18) and the server's options are unknown. */
export const FALLBACK_TRANSLATIONS = ["ESV", "KJV", "NIV", "NLT"];
export const FALLBACK_BINDINGS = ["Hardcover", "Leather-look", "Paperback"];

const PRICE_DEBOUNCE_MS = 600;

function toggle(list: string[], value: string, on: boolean): string[] {
  return on ? [...list, value] : list.filter((v) => v !== value);
}

function dollarsOrNull(raw: string): number | null {
  return /^\d{1,6}$/.test(raw.trim()) ? Number(raw.trim()) : null;
}

/** Price inputs are debounced (C03), so typing "40" is one request, not two. */
function PriceRange({ query, onChange }: { query: ListingQuery; onChange: (min: number | null, max: number | null) => void }) {
  const id = useId();
  const [min, setMin] = useState(query.priceMin?.toString() ?? "");
  const [max, setMax] = useState(query.priceMax?.toString() ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A chip removal or Back changes the URL: show its values.
  useEffect(() => {
    setMin(query.priceMin?.toString() ?? "");
    setMax(query.priceMax?.toString() ?? "");
  }, [query.priceMin, query.priceMax]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function schedule(nextMin: string, nextMax: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(dollarsOrNull(nextMin), dollarsOrNull(nextMax));
    }, PRICE_DEBOUNCE_MS);
  }

  return (
    <fieldset className={fieldBox}>
      <legend className={`${fieldLabel} float-left mb-1 w-full`}>Price range</legend>
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-min`} className="sr-only">
          Minimum price in dollars
        </label>
        <input
          id={`${id}-min`}
          inputMode="numeric"
          placeholder="$0"
          value={min}
          onChange={(e) => {
            setMin(e.target.value);
            schedule(e.target.value, max);
          }}
          className="w-full min-w-0 border border-line p-1"
        />
        <span aria-hidden="true">—</span>
        <label htmlFor={`${id}-max`} className="sr-only">
          Maximum price in dollars
        </label>
        <input
          id={`${id}-max`}
          inputMode="numeric"
          placeholder="$100"
          value={max}
          onChange={(e) => {
            setMax(e.target.value);
            schedule(min, e.target.value);
          }}
          className="w-full min-w-0 border border-line p-1"
        />
      </div>
    </fieldset>
  );
}

/**
 * "Filter Bibles" (C03/C04). Every control changes the URL immediately and
 * resets to page 1. Below md it collapses behind a "Filters" toggle.
 */
export function FilterSidebar({ translations, bindings }: { translations: string[]; bindings: string[] }) {
  const { query, navigate } = useListing();
  const id = useId();
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const set = (patch: Partial<ListingQuery>) => {
    navigate(updateListingQuery(query, patch));
  };
  // Keep a selected value visible even if it is not offered for this category.
  const translationOptions = [...new Set([...translations, ...query.translation])];
  const bindingOptions = [...new Set([...bindings, ...(query.binding ? [query.binding] : [])])];

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 md:w-[230px]">
      <button
        type="button"
        className={`${secondaryButton} md:hidden`}
        aria-expanded={openOnMobile}
        aria-controls={`${id}-filters`}
        onClick={() => {
          setOpenOnMobile((v) => !v);
        }}
      >
        Filters
      </button>
      <section
        id={`${id}-filters`}
        aria-labelledby={`${id}-heading`}
        className={`${openOnMobile ? "flex" : "hidden"} flex-col gap-3 border border-line p-4 text-sm md:flex`}
      >
        <h2 id={`${id}-heading`} className="text-base font-semibold">
          Filter Bibles
        </h2>

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1">Translation</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {translationOptions.map((t) => (
              <label key={t} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={query.translation.includes(t)}
                  onChange={(e) => {
                    set({ translation: toggle(query.translation, t, e.target.checked) });
                  }}
                />
                {t}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1">Bible type</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {BIBLE_TYPES.map((t) => (
              <label key={t.value} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={query.type.includes(t.value)}
                  onChange={(e) => {
                    set({ type: toggle(query.type, t.value, e.target.checked) });
                  }}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={fieldBox}>
          <label htmlFor={`${id}-language`} className={fieldLabel}>
            Language
          </label>
          <select
            id={`${id}-language`}
            value={query.language}
            onChange={(e) => {
              set({ language: e.target.value as ListingQuery["language"] });
            }}
            className="border border-line bg-white p-1"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="all">All languages</option>
          </select>
        </div>

        <div className={fieldBox}>
          <label htmlFor={`${id}-binding`} className={fieldLabel}>
            Binding
          </label>
          <select
            id={`${id}-binding`}
            value={query.binding ?? ""}
            onChange={(e) => {
              set({ binding: e.target.value || null });
            }}
            className="border border-line bg-white p-1"
          >
            <option value="">All bindings</option>
            {bindingOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <PriceRange
          query={query}
          onChange={(priceMin, priceMax) => {
            if (priceMin !== query.priceMin || priceMax !== query.priceMax) set({ priceMin, priceMax });
          }}
        />

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={query.availability === "in-stock"}
              onChange={(e) => {
                set({ availability: e.target.checked ? "in-stock" : "all" });
              }}
            />
            In stock only
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={query.largePrint}
              onChange={(e) => {
                set({ largePrint: e.target.checked });
              }}
            />
            Large print
          </label>
        </div>

        <button
          type="button"
          className={`${secondaryButton} self-start`}
          onClick={() => {
            navigate(clearListingFilters(query));
          }}
        >
          Clear all filters
        </button>
      </section>
    </div>
  );
}
