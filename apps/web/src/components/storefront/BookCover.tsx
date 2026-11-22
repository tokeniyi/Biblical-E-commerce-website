import { coverPalette, hashString, translationFromTitle, wrapTitle, type CoverPalette } from "@/lib/imagery";

export type CoverView = "front" | "back" | "spine" | "pages";

type BookCoverProps = {
  /** Product title printed on the cover. */
  title: string;
  translation?: string | null;
  binding?: string;
  view?: CoverView;
  /** Sizing classes; defaults to a 3:4 box that fills its column. */
  sizeClass?: string;
  className?: string;
  /** Accessible name override (defaults to "<title> cover"). */
  alt?: string;
  /** Decorative instances (e.g. inside a link that already names the product). */
  decorative?: boolean;
};

const VIEW_LABEL: Record<CoverView, string> = {
  front: "front cover",
  back: "back cover",
  spine: "spine",
  pages: "interior pages",
};

/**
 * Demo product image: an SVG book drawn from the product's title, binding and
 * translation (see lib/imagery.ts). Swap for real photography later.
 */
export function BookCover({
  title,
  translation,
  binding,
  view = "front",
  sizeClass = "aspect-[3/4]",
  className,
  alt,
  decorative = false,
}: BookCoverProps) {
  const palette = coverPalette(title, binding);
  const id = `bc${String(hashString(`${title}|${binding ?? ""}|${view}`))}`;
  const label = alt ?? `${title} ${VIEW_LABEL[view]}`;
  const abbr = translation ?? translationFromTitle(title);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl ${sizeClass} ${className ?? ""}`}
      style={{ backgroundColor: palette.backdrop }}
    >
      <svg
        viewBox="0 0 300 400"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : label}
        aria-hidden={decorative || undefined}
      >
        <Defs id={id} palette={palette} />
        <ellipse cx="150" cy="372" rx="104" ry="10" fill="#1f2433" opacity="0.12" />
        {view === "front" ? <Front id={id} palette={palette} title={title} abbr={abbr} /> : null}
        {view === "back" ? <Back id={id} palette={palette} /> : null}
        {view === "spine" ? <Spine id={id} palette={palette} title={title} abbr={abbr} /> : null}
        {view === "pages" ? <Pages /> : null}
      </svg>
    </div>
  );
}

function Defs({ id, palette }: { id: string; palette: CoverPalette }) {
  return (
    <defs>
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
        <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id={`${id}-spine`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={palette.shade} />
        <stop offset="0.6" stopColor={palette.base} />
        <stop offset="1" stopColor={palette.shade} />
      </linearGradient>
      <pattern id={`${id}-grain`} width="6" height="6" patternUnits="userSpaceOnUse">
        {palette.finish === "leather" ? (
          <>
            <circle cx="1" cy="1" r="0.7" fill="#000" opacity="0.18" />
            <circle cx="4" cy="3.5" r="0.6" fill="#fff" opacity="0.06" />
          </>
        ) : palette.finish === "cloth" ? (
          <path d="M0 6 L6 0" stroke="#000" strokeWidth="0.5" opacity="0.12" />
        ) : (
          <rect width="6" height="6" fill="none" />
        )}
      </pattern>
    </defs>
  );
}

/** Book body shared by front and back: page block, cover board, texture and light. */
function Board({ id, palette, children }: { id: string; palette: CoverPalette; children?: React.ReactNode }) {
  return (
    <g>
      {/* page block peeking out on the right and bottom */}
      <rect x="80" y="58" width="152" height="300" rx="4" fill="#f4eddd" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="226" y1={64 + i} x2="226" y2={352 - i} stroke="#d9cfbb" strokeWidth="0.8" transform={`translate(${String(i * 1.4)} 0)`} />
      ))}
      <rect x="68" y="44" width="160" height="308" rx="7" fill={palette.base} />
      <rect x="68" y="44" width="160" height="308" rx="7" fill={`url(#${id}-grain)`} />
      <rect x="68" y="44" width="18" height="308" rx="5" fill={`url(#${id}-spine)`} opacity="0.85" />
      <rect x="68" y="44" width="160" height="308" rx="7" fill={`url(#${id}-light)`} />
      {children}
    </g>
  );
}

function Front({ id, palette, title, abbr }: { id: string; palette: CoverPalette; title: string; abbr: string | null }) {
  const lines = wrapTitle(title.replace(/^(ESV|NIV|KJV|NLT|NKJV|CSB|NASB|RVR1960|NVI)\s+/i, ""), 10, 4);
  const startY = 190 - (lines.length - 1) * 13;
  const paper = palette.finish === "paper";
  return (
    <Board id={id} palette={palette}>
      {paper ? (
        <rect x="86" y="292" width="142" height="40" fill={palette.shade} opacity="0.55" />
      ) : (
        <rect x="96" y="62" width="118" height="272" rx="3" fill="none" stroke={palette.foil} strokeWidth="1.2" opacity="0.75" />
      )}
      {/* ornament */}
      <g stroke={palette.foil} strokeWidth="1.4" opacity="0.9" fill="none">
        <path d={`M155 ${String(startY - 52)} v26 M146 ${String(startY - 43)} h18`} />
        <path d={`M128 ${String(startY - 20)} h54`} strokeWidth="0.8" />
      </g>
      <g fill={palette.foil} textAnchor="middle" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
        {lines.map((line, i) => (
          <text key={i} x="155" y={startY + i * 26} fontSize={lines.some((l) => l.length > 9) ? 17 : 20} fontWeight="600" letterSpacing="0.3">
            {line}
          </text>
        ))}
      </g>
      <path d={`M128 ${String(startY + lines.length * 26 - 6)} h54`} stroke={palette.foil} strokeWidth="0.8" opacity="0.9" />
      {abbr ? (
        <text
          x="155"
          y={paper ? 318 : 312}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          letterSpacing="3"
          fill={paper ? "#fffaf2" : palette.foil}
          style={{ fontFamily: "var(--font-sans), sans-serif" }}
        >
          {abbr}
        </text>
      ) : null}
      {/* ribbon marker */}
      <path d="M196 350 v26 l5 -6 l5 6 v-26 z" fill="#8c1c1c" opacity={paper ? 0 : 0.9} />
    </Board>
  );
}

function Back({ id, palette }: { id: string; palette: CoverPalette }) {
  return (
    <Board id={id} palette={palette}>
      <g fill={palette.foil} opacity="0.55">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="104" y={100 + i * 14} width={i === 5 ? 60 : 104} height="4" rx="2" />
        ))}
      </g>
      <rect x="150" y="280" width="62" height="40" rx="2" fill="#fff" />
      <g fill="#1f2433">
        {Array.from({ length: 18 }, (_, i) => (
          <rect key={i} x={154 + i * 3} y="285" width={i % 3 === 0 ? 2 : 1} height="26" />
        ))}
      </g>
    </Board>
  );
}

function Spine({ id, palette, title, abbr }: { id: string; palette: CoverPalette; title: string; abbr: string | null }) {
  return (
    <g>
      <rect x="122" y="40" width="56" height="316" rx="8" fill={palette.base} />
      <rect x="122" y="40" width="56" height="316" rx="8" fill={`url(#${id}-grain)`} />
      <rect x="122" y="40" width="56" height="316" rx="8" fill={`url(#${id}-spine)`} opacity="0.6" />
      {[80, 92, 304, 316].map((y) => (
        <rect key={y} x="126" y={y} width="48" height="2" fill={palette.foil} opacity="0.8" />
      ))}
      <text
        x="150"
        y="198"
        transform="rotate(90 150 198)"
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill={palette.foil}
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        {title.length > 26 ? `${title.slice(0, 25)}…` : title}
      </text>
      {abbr ? (
        <text x="150" y="290" textAnchor="middle" fontSize="10" fontWeight="700" fill={palette.foil} letterSpacing="1">
          {abbr}
        </text>
      ) : null}
    </g>
  );
}

function Pages() {
  const lines = Array.from({ length: 16 }, (_, i) => i);
  return (
    <g>
      <path d="M30 96 Q90 80 150 100 L150 340 Q90 320 30 336 Z" fill="#fbf6ea" stroke="#e2d6bf" />
      <path d="M270 96 Q210 80 150 100 L150 340 Q210 320 270 336 Z" fill="#fffaf0" stroke="#e2d6bf" />
      <line x1="150" y1="100" x2="150" y2="340" stroke="#cdbf9f" strokeWidth="1.5" />
      <g fill="#7a6f5c" opacity="0.55">
        {lines.map((i) => (
          <rect key={`l${String(i)}`} x="44" y={120 + i * 12} width={i % 5 === 4 ? 56 : 92} height="3" rx="1.5" />
        ))}
        {lines.map((i) => (
          <rect key={`r${String(i)}`} x="164" y={120 + i * 12} width={i % 6 === 5 ? 50 : 92} height="3" rx="1.5" />
        ))}
      </g>
      <text x="60" y="114" fontSize="9" fontWeight="700" fill="#7a2e2e">
        GENESIS 1
      </text>
      <path d="M232 300 v52 l5 -6 l5 6 v-52 z" fill="#8c1c1c" />
    </g>
  );
}
