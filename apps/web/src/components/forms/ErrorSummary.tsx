"use client";

import { forwardRef } from "react";
import { statusBox } from "@/components/ui/styles";

export type SummaryItem = { fieldId: string; message: string };

/**
 * E07 error summary: "Check 2 fields" with one link per problem. Each link
 * moves focus to its field.
 */
export const ErrorSummary = forwardRef<HTMLDivElement, { items: readonly SummaryItem[] }>(function ErrorSummary(
  { items },
  ref,
) {
  if (items.length === 0) return null;
  return (
    <div ref={ref} role="alert" tabIndex={-1} className={`${statusBox} border-2 border-danger`} aria-labelledby="error-summary-title">
      <p id="error-summary-title" className="text-base font-semibold">
        Check {items.length} {items.length === 1 ? "field" : "fields"}
      </p>
      <ul className="text-sm">
        {items.map((item) => (
          <li key={item.fieldId}>
            <a
              href={`#${item.fieldId}`}
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.fieldId)?.focus();
              }}
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});

/** Focus the first field (in DOM order) that has an error. */
export function focusFirstInvalid(form: HTMLElement | null): void {
  const first = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
  first?.focus();
}
