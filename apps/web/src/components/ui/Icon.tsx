/** Minimal inline icon set (stroke icons, 24px grid). Always decorative: pair with text or aria-label. */
const PATHS = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  heart: "M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 2.4C21 15 12 20.5 12 20.5Z",
  bag: "M6 7h12l1 14H5L6 7Zm3 0V6a3 3 0 0 1 6 0v1",
  truck: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Zm-3 9 2 2 4-4",
  rotate: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13",
  chevronRight: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  check: "m5 12 5 5 9-10",
  x: "M6 6l12 12M18 6 6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  cookie: "M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 1-4-4Zm-3 8h.01M15 15h.01M10 16h.01",
  package: "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  gift: "M3 10h18v4H3zM5 14v7h14v-7M12 10v11M12 10S10 4 7.5 5.5 9 10 12 10Zm0 0s2-6 4.5-4.5S15 10 12 10Z",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
  arrowRight: "M5 12h14m-6-6 6 6-6 6",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5", filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Read-only star rating; the number is always given in text too. */
export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center text-gold" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" className={className} filled={value >= i - 0.25} />
      ))}
    </span>
  );
}
