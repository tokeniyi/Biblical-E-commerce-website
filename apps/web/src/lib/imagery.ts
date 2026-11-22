/**
 * Demo imagery: deterministic cover art for products until real photography
 * exists. Image CDNs are not reachable from the build environment, so covers
 * are drawn as SVG from the product's own attributes (docs/ECOMMERCE_BUILD_PLAN.md §1).
 */

export type CoverFinish = "leather" | "cloth" | "paper";

export type CoverPalette = {
  /** Cover base color. */
  base: string;
  /** Darker shade for the spine and edges. */
  shade: string;
  /** Foil / title color. */
  foil: string;
  /** Background wash behind the book. */
  backdrop: string;
  finish: CoverFinish;
};

/** Leather and cloth colorways, chosen to read well with gold foil. */
const RICH = [
  { base: "#5c1f1f", shade: "#3d1414", backdrop: "#f4e7e3" }, // oxblood
  { base: "#1f2a44", shade: "#131a2c", backdrop: "#e7ebf3" }, // navy
  { base: "#2f4a3a", shade: "#1e3026", backdrop: "#e5efe8" }, // forest
  { base: "#4a3426", shade: "#2f2118", backdrop: "#f1e9e1" }, // walnut
  { base: "#2b2b2e", shade: "#18181a", backdrop: "#ecebe8" }, // charcoal
  { base: "#6b4a2b", shade: "#47301b", backdrop: "#f3ead9" }, // saddle
] as const;

/** Lighter printed-cover colorways for paperbacks and children's editions. */
const BRIGHT = [
  { base: "#c9a46a", shade: "#a5814a", backdrop: "#f7f0e3", foil: "#1f2433" },
  { base: "#8fb1c9", shade: "#6c8fa8", backdrop: "#eef4f8", foil: "#1f2433" },
  { base: "#d08c6c", shade: "#ad6a4b", backdrop: "#f8ece6", foil: "#fffaf2" },
  { base: "#9fb88e", shade: "#7c966b", backdrop: "#eef4ea", foil: "#1f2433" },
  { base: "#e2c9a0", shade: "#c4a77a", backdrop: "#faf4ea", foil: "#5c1f1f" },
] as const;

/** Small stable string hash (FNV-1a), so a product always gets the same cover. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function finishFor(binding: string | undefined): CoverFinish {
  const b = (binding ?? "").toLowerCase();
  if (b.includes("leather")) return "leather";
  if (b.includes("paper")) return "paper";
  return "cloth";
}

export function coverPalette(title: string, binding?: string): CoverPalette {
  const finish = finishFor(binding);
  const seed = hashString(`${title}|${binding ?? ""}`);
  const childish = /child|kid/i.test(title);
  if (finish === "paper" || childish) {
    const c = BRIGHT[seed % BRIGHT.length] ?? BRIGHT[0];
    return { base: c.base, shade: c.shade, foil: c.foil, backdrop: c.backdrop, finish };
  }
  const c = RICH[seed % RICH.length] ?? RICH[0];
  return { ...c, foil: "#d9b878", finish };
}

/** Splits a title into at most `maxLines` lines of roughly `width` characters. */
export function wrapTitle(title: string, width = 12, maxLines = 4): string[] {
  const words = title.replace(/[’']/g, "’").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1] ?? ""}…`;
  return kept;
}

/** Translation abbreviations that appear on a cover, if the title carries one. */
const KNOWN_TRANSLATIONS = ["ESV", "NIV", "KJV", "NLT", "NKJV", "CSB", "NASB", "RVR1960", "NVI"];

export function translationFromTitle(title: string): string | null {
  const first = title.split(/\s+/)[0]?.toUpperCase() ?? "";
  return KNOWN_TRANSLATIONS.includes(first) ? first : null;
}
