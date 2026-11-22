/**
 * Describes click targets for analytics without reading form values: the
 * explicit data-track name wins, then aria-label, then visible text.
 */
import { scrubText } from "./sanitize";

export const INTERACTIVE_SELECTOR =
  'a[href], button, summary, select, label, input, textarea, [role="button"], [role="link"], [role="tab"], [data-track]';

/** Elements people tend to click expecting something (dead-click candidates). */
const LOOKS_CLICKABLE_SELECTOR = 'img, svg[role="img"], [role="img"], h2, h3, [data-track-zone]';

export function describeTarget(el: Element): string {
  const explicit = el.closest("[data-track]")?.getAttribute("data-track");
  if (explicit) return scrubText(explicit, 60);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    // Never the value: only which field it was.
    const label = el.labels?.[0]?.textContent ?? el.getAttribute("aria-label") ?? el.name;
    return scrubText(`Field: ${label || el.type}`, 60);
  }
  const aria = el.getAttribute("aria-label");
  if (aria) return scrubText(aria, 60);
  const text = el.textContent ?? "";
  if (text.trim()) return scrubText(text, 60);
  return el.tagName.toLowerCase();
}

export function interactiveAncestor(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) : null;
}

/** A click on something that is not interactive but looks like it might be. */
export function deadClickTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  if (interactiveAncestor(target)) return null;
  const candidate = target.closest(LOOKS_CLICKABLE_SELECTOR);
  if (!candidate) return null;
  const zone = candidate.closest("[data-track-zone]")?.getAttribute("data-track-zone");
  if (zone) return scrubText(zone, 60);
  const label = candidate.getAttribute("aria-label");
  return scrubText(label ?? candidate.tagName.toLowerCase(), 60);
}

export type ClickSample = { x: number; y: number; at: number };

/** Three or more clicks within 700 ms inside a 32px radius count as a rage click. */
export function isRageClick(samples: readonly ClickSample[], latest: ClickSample): boolean {
  const recent = samples.filter((s) => latest.at - s.at <= 700 && Math.hypot(s.x - latest.x, s.y - latest.y) <= 32);
  return recent.length >= 2;
}

/** Furthest point scrolled, as a percentage of the page height. */
export function scrollPercent(): number {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  if (max <= 0) return 100;
  return Math.min(100, Math.round(((window.scrollY + 0) / max) * 100));
}
