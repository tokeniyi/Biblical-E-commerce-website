"use client";

import { useState } from "react";
import { BookCover, type CoverView } from "./BookCover";

const VIEWS: { view: CoverView; label: string }[] = [
  { view: "front", label: "Front" },
  { view: "back", label: "Back" },
  { view: "spine", label: "Spine" },
  { view: "pages", label: "Pages" },
];

/**
 * Product gallery with labelled thumbnails (all views visible, none hidden
 * behind arrows). Thumbnails are real buttons, so clicking the image area
 * always does something.
 */
export function ProductGallery({ title, translation, binding }: { title: string; translation: string | null; binding?: string }) {
  const [active, setActive] = useState<CoverView>("front");
  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-36 lg:self-start" data-track-zone="Product gallery">
      <BookCover title={title} translation={translation} binding={binding} view={active} sizeClass="aspect-[4/5]" className="shadow-card" />
      <div className="grid grid-cols-4 gap-3" role="group" aria-label="Product images">
        {VIEWS.map(({ view, label }) => (
          <button
            key={view}
            type="button"
            aria-pressed={active === view}
            aria-label={`Show ${label.toLowerCase()} view`}
            onClick={() => { setActive(view); }}
            data-track={`gallery-${view}`}
            className="flex flex-col items-center gap-1 rounded-xl border-2 border-transparent p-1 text-xs font-medium text-muted hover:border-line aria-pressed:border-brand aria-pressed:text-ink"
          >
            <BookCover title={title} translation={translation} binding={binding} view={view} decorative sizeClass="aspect-square" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
