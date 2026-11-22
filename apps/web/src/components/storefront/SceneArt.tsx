/**
 * Demo lifestyle illustrations for the home hero and category tiles. Drawn
 * as SVG because image CDNs are unavailable here; replace with photography.
 */

type SceneProps = { className?: string; label?: string };

function Book({ x, y, w, h, color, foil = "#d9b878", tilt = 0 }: { x: number; y: number; w: number; h: number; color: string; foil?: string; tilt?: number }) {
  return (
    <g transform={`rotate(${String(tilt)} ${String(x + w / 2)} ${String(y + h / 2)})`}>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={color} />
      <rect x={x} y={y} width={w} height={h} rx="4" fill="url(#scene-light)" />
      <rect x={x + 4} y={y + 6} width="2" height={h - 12} fill={foil} opacity="0.7" />
      <rect x={x + w - 6} y={y + 6} width="2" height={h - 12} fill={foil} opacity="0.7" />
    </g>
  );
}

function SharedDefs() {
  return (
    <defs>
      <linearGradient id="scene-light" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
        <stop offset="1" stopColor="#000" stopOpacity="0.18" />
      </linearGradient>
      <radialGradient id="scene-glow" cx="0.7" cy="0.25" r="0.7">
        <stop offset="0" stopColor="#fff6de" />
        <stop offset="1" stopColor="#f3ead9" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Home hero: window light falling on an open Bible and a stack of editions. */
export function HeroArt({ className, label = "An open Bible on a reading desk beside a stack of leather editions" }: SceneProps) {
  return (
    <svg viewBox="0 0 560 440" className={className} role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <SharedDefs />
      <rect width="560" height="440" fill="#efe6d6" />
      {/* arched window */}
      <path d="M330 40 h170 v220 h-170 z M330 40 a85 85 0 0 1 170 0" fill="#f9f3e6" />
      <path d="M330 125 a85 85 0 0 1 170 0 v175 h-170 z" fill="#fdf8ee" stroke="#d8c9ad" strokeWidth="6" />
      <path d="M415 40 v260 M330 200 h170" stroke="#d8c9ad" strokeWidth="5" />
      <rect width="560" height="440" fill="url(#scene-glow)" />
      {/* light beam */}
      <path d="M335 300 L500 300 L380 440 L120 440 Z" fill="#fff8e6" opacity="0.55" />
      {/* desk */}
      <rect x="0" y="330" width="560" height="110" fill="#8a6a4a" />
      <rect x="0" y="330" width="560" height="10" fill="#a5814a" />
      {/* stack of books */}
      <Book x={44} y={268} w={168} h={26} color="#1f2a44" />
      <Book x={54} y={294} w={150} h={22} color="#5c1f1f" />
      <Book x={36} y={316} w={178} h={24} color="#2f4a3a" />
      <Book x={60} y={244} w={140} h={24} color="#4a3426" tilt={-3} />
      {/* open Bible */}
      <g>
        <path d="M200 336 Q270 300 340 322 L340 346 Q270 326 200 360 Z" fill="#5c1f1f" />
        <path d="M480 336 Q410 300 340 322 L340 346 Q410 326 480 360 Z" fill="#5c1f1f" />
        <path d="M210 330 Q275 292 340 314 L340 336 Q275 318 210 350 Z" fill="#fffaf0" />
        <path d="M470 330 Q405 292 340 314 L340 336 Q405 318 470 350 Z" fill="#fbf4e4" />
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${String(228 + i * 2)} ${String(326 - i * 4)} Q280 ${String(302 - i * 3)} 330 ${String(318 - i)}`} stroke="#9c8f78" strokeWidth="1.4" fill="none" opacity="0.5" />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${String(452 - i * 2)} ${String(326 - i * 4)} Q400 ${String(302 - i * 3)} 350 ${String(318 - i)}`} stroke="#9c8f78" strokeWidth="1.4" fill="none" opacity="0.5" />
        ))}
        <path d="M338 330 v40 l4 -5 l4 5 v-40 z" fill="#a5814a" />
      </g>
      {/* plant */}
      <g transform="translate(482 250)">
        <path d="M10 80 h40 l-6 0 l-4 0 v0 l-4 -0 z" fill="#c9a46a" />
        <rect x="6" y="52" width="44" height="30" rx="4" fill="#c9a46a" />
        <path d="M28 52 C10 30 6 14 14 0 M28 52 C40 26 52 18 58 6 M28 52 C24 36 30 20 34 10" stroke="#2f4a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const CATEGORY_SCENES: Record<string, { bg: string; draw: () => React.ReactNode }> = {
  study: {
    bg: "#e7ebf3",
    draw: () => (
      <>
        <Book x={40} y={60} w={110} h={150} color="#1f2a44" />
        <circle cx="170" cy="150" r="34" fill="#fff" fillOpacity="0.4" stroke="#4a3426" strokeWidth="8" />
        <path d="M194 174 L226 206" stroke="#4a3426" strokeWidth="10" strokeLinecap="round" />
      </>
    ),
  },
  devotional: {
    bg: "#f4e7e3",
    draw: () => (
      <>
        <Book x={50} y={70} w={100} h={140} color="#5c1f1f" />
        <path d="M170 150 h50 v40 a25 25 0 0 1 -50 0 z" fill="#fffaf0" stroke="#4a3426" strokeWidth="4" />
        <path d="M220 160 a14 14 0 0 1 0 24" stroke="#4a3426" strokeWidth="4" fill="none" />
        <path d="M185 140 q6 -12 0 -24 M200 140 q6 -12 0 -24" stroke="#a5814a" strokeWidth="3" fill="none" />
      </>
    ),
  },
  children: {
    bg: "#eef4ea",
    draw: () => (
      <>
        <Book x={46} y={90} w={80} h={120} color="#d08c6c" foil="#fffaf2" tilt={-6} />
        <Book x={120} y={80} w={86} h={130} color="#8fb1c9" foil="#fffaf2" tilt={4} />
        <path d="M200 50 l8 18 20 2 -15 13 5 20 -18 -11 -18 11 5 -20 -15 -13 20 -2 z" fill="#c9a46a" />
      </>
    ),
  },
  "large-print": {
    bg: "#f3ead9",
    draw: () => (
      <>
        <Book x={50} y={60} w={130} h={160} color="#2f4a3a" />
        <text x="168" y="170" fontSize="64" fontWeight="700" fill="#5c1f1f" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
          Aa
        </text>
      </>
    ),
  },
  "gift-editions": {
    bg: "#f8ece6",
    draw: () => (
      <>
        <Book x={70} y={70} w={130} h={150} color="#6b4a2b" />
        <rect x="128" y="70" width="14" height="150" fill="#a5814a" />
        <path d="M135 70 c-30 -30 -50 0 0 0 c30 -30 50 0 0 0" stroke="#a5814a" strokeWidth="8" fill="none" />
      </>
    ),
  },
  journaling: {
    bg: "#eef4f8",
    draw: () => (
      <>
        <Book x={50} y={60} w={120} h={160} color="#e2c9a0" foil="#5c1f1f" />
        <path d="M190 210 L240 70" stroke="#1f2433" strokeWidth="9" strokeLinecap="round" />
        <path d="M188 214 l2 -12 6 4 z" fill="#1f2433" />
      </>
    ),
  },
};

CATEGORY_SCENES["family-reading"] = CATEGORY_SCENES.children ?? CATEGORY_SCENES.study!;
CATEGORY_SCENES.bibles = CATEGORY_SCENES.devotional ?? CATEGORY_SCENES.study!;

export function hasCategoryArt(slug: string): boolean {
  return slug in CATEGORY_SCENES;
}

/** Small illustration for a category tile. Decorative by default. */
export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  const scene = CATEGORY_SCENES[slug] ?? CATEGORY_SCENES.study;
  if (!scene) return null;
  return (
    <svg viewBox="0 0 280 240" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <SharedDefs />
      <rect width="280" height="240" fill={scene.bg} />
      <ellipse cx="140" cy="222" rx="110" ry="8" fill="#1f2433" opacity="0.08" />
      {scene.draw()}
    </svg>
  );
}
