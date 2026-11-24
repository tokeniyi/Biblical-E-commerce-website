"use client";

import { useSearchParams } from "next/navigation";
import { categories, categoryName, edit } from "@/lib/trendy";
import { ProductCard } from "../product-card";

export function Catalogue() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const inStock = params.get("stock") === "1";
  const terms = query.trim().toLowerCase().split(/\s+/);
  const results = edit.filter((product) => {
    const aliases = {
      clothing: "apparel clothes",
      footwear: "shoes sneakers trainers",
      accessories: "accessory",
    };
    const keywords = [
      product.name,
      categoryName(product.category),
      product.description,
      aliases[product.category],
      ...product.colours.map((colour) => colour.name),
      ...product.sizes,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!category || product.category === category) &&
      terms.every((term) => keywords.includes(term)) &&
      (!inStock || product.colours.some((colour) => colour.stock.some((quantity) => quantity > 0)))
    );
  });

  function update(name: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(name, value);
    else next.delete(name);
    const search = next.toString();
    window.history.replaceState(null, "", search ? `?${search}` : "/collection");
  }

  return (
    <>
      <div className="catalogue-controls">
        <div className="filter-categories" role="group" aria-label="Product categories">
          {[{ name: "All", slug: "" }, ...categories].map(({ name, slug }) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === slug}
              onClick={() => update("category", slug)}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="search-label">
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(event) => update("q", event.target.value)}
            placeholder="Search jerseys, sneakers, accessories…"
          />
        </label>
        <label className="stock-filter">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) => update("stock", event.target.checked ? "1" : "")}
          />
          In stock only
        </label>
      </div>
      <p className="result-count" role="status">
        {results.length} {results.length === 1 ? "style" : "styles"}
      </p>
      {results.length > 0 ? (
        <div className="tl-grid">
          {results.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No styles found</h2>
          <button
            className="tl-button"
            type="button"
            onClick={() => window.history.replaceState(null, "", "/collection")}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
