# Design Documentation — Bible Commerce Platform Frontend

Audience: frontend developers and AI coding agents building or modifying UI in `apps/web`.

Purpose: establish a **clear, opinionated, product-specific visual and interaction system** for this Bible content + commerce platform.

---

## Product Context

This is a **Bible content and commerce platform** — a Next.js frontend serving blog, devotional, and Bible study content (managed in Sanity), with user accounts, paid content/features via Paystack + Stripe, file uploads, and search. The backend is NestJS deployed to Railway/Fly.io with Postgres (Neon), Paystack, Stripe, Cloudinary, and AWS S3.

**Key constraints from the codebase:**

| Constraint | Detail |
|---|---|
| Framework | Next.js 16.3.4, React 19.1.0 |
| Path aliases | `@/*` → `./src/*`, `@shared/*` → `../../packages/shared/src/*` |
| Test runner | Vitest |
| Styling | Tailwind-compatible design tokens (no CSS-in-JS) |
| Auth | Auth.js JWT strategy, shared `AUTH_SECRET` |
| Payments | Paystack (NGN/regional), Stripe (international) |
| CMS | Sanity Studio for blog/devotional/content |
| Search | Meilisearch (adapter layer for future Algolia swap) |
| File uploads | Cloudinary (images), AWS S3 (larger files) |
| Deploy | Vercel |

This is not a SaaS dashboard template. The design must serve:
- **Scripture reading and study** — text-heavy, focus on readability
- **Commerce transactions** — clear pricing, payment flow, order tracking
- **User account management** — subscriptions, purchases, settings
- **Content browsing** — search, catalog, devotional reading

---

## Design Direction

### Visual Character
**Restrained, information-dense, intentional.**

| Characteristic | Value |
|---|---|
| Visual density | High — prioritize scanability and data density |
| Typography personality | Functional, readable, neutral (Inter) |
| Spacing rhythm | 4px baseline grid, consistent multiples |
| Border usage | Subtle dividers, no heavy borders |
| Surface hierarchy | Background differences, minimal elevation |
| Color relationships | Semantic tokens, no arbitrary values |
| Interaction style | Subtle color/opacity shifts, no transforms |
| Navigation style | Text-based links, active underline |
| Content width | `max-w-2xl` (1440px) centered |
| Responsive strategy | Mobile-first, defined transformations |

### Why This Fits

- Bible users value clarity and reverence over visual flash
- Commerce needs trust, not trendiness
- Content density matters: users compare, filter, and purchase
- A mature, restrained aesthetic communicates reliability for faith-based content

### Not This Direction

- No generic "modern SaaS" gradients, cards, and rounded corners
- No decorative floating elements or illustration-heavy design
- No excessive whitespace that buries pricing or content
- No pill-shaped buttons and glassmorphism everywhere

---

## Layout System

### Page Structure

```
[header]            ← persistent across authenticated routes
[navigation]        ← contextual: home, shop, library, account
[main]              ← primary content area
[aside]             ← optional: filters, sidebar, user actions
[footer]            ← links, copyright, minimal
```

### Maximum Content Width

| Breakpoint | Max-width class |
|---|---|
| Desktop | `max-w-7xl` (≈1280px) |
| Tablet | `max-w-2xl` (≈768px) |
| Mobile | full-width, single-column |

### Primary Container Behavior

- No unnecessary wrapper divs
- Content area uses max-width only. No border, no background, no padding unless semantically needed
- Page background: `bg-background` — true white `#FFFFFF` or subtle off-white `#FAFAFA`

### Sidebar Behavior

- **Primary navigation**: persistent horizontal bar below header on desktop. Transforms to hamburger drawer on mobile
- **Secondary sidebar**: only when it adds functional value (filters, product categories, account sections). Otherwise integrate into document flow

### Navigation Behavior

- **Primary nav**: text-links only. No pill shapes unless justified
- Active state: subtle underline (`border-b-2 border-primary`) or text color change. Never background fill
- Hover: color change only. No background shadow or transform
- Mobile: hamburger icon → full-screen drawer with close button

### Grid Usage

- **12-column grid** only where data-density demands it (product catalog, tables)
- **Default**: 1-column flow for most content
- Gutters: `gap-4` (desktop), `gap-3` (tablet), `gap-2` (mobile)
- Never use grid merely for visual separation

### Column Sizing

```css
/* Default: full width */
col-span-1

/* Catalog/products: */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

/* Tables: */
first-column: w-1/4 (identifier)
middle: flex-1 (content)
last: w-20 (actions)
```

### Spacing Scale

Use Tailwind spacing tokens. No arbitrary values.

| Class | Pixels | Usage |
|---|---|---|
| `p-1` | 4px | Minimal padding (e.g., inside badges) |
| `p-2` | 8px | Input button padding |
| `p-3` | 12px | Secondary element padding |
| `p-4` | 16px | Standard content padding |
| `p-6` | 24px | Section padding |
| `p-8` | 32px | Large section padding |

### Vertical Rhythm

- Baseline: 4px increment (Tailwind's `space-y-*` uses this by default)
- Body line-height: `leading-relaxed` (1.6)
- Headings: proportional scale. Never less than `leading-snug` (1.25)
- Paragraph spacing: `mt-2` after each paragraph. Never `mb-4` on every line

### Section Spacing

| Element | Margin |
|---|---|
| `<h1>` → body | `mt-8` |
| `<h2>` → body | `mt-6` |
| `<h3>` → body | `mt-4` |
| `<p>` → next `<p>` | `mt-2` |
| `<ul>` → next | `mt-4` |
| `<section>` → next | `mt-8` |
| `<hr>` | `my-6` (no decorative hr) |

Never use `mx-auto` on body. That creates horizontal scroll on mobile.

---

## Borders and Corner Radius

### Radius Strategy

| Class | Radius | Usage |
|---|---|---|
| `rounded-none` | 0px | Default. Tables, inputs, navigation, forms |
| `rounded-sm` | 2px | Border-based surfaces only |
| `rounded-md` | 4px | Cards, modals, elevated surfaces |
| `rounded-lg` | 8px | Avatars, profile images only |

### Prohibited as defaults

- `rounded-full`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` — never as arbitrary defaults
- Every use of strong rounding must have a reason documented in component spec

### Components that should have no radius

- Tables (all cells)
- Navigation links
- Form inputs and labels
- Data-heavy interfaces
- Administrative interfaces
- Dense content areas

### Components where radius is appropriate

- Cards: `rounded-md`
- Modals: `rounded-md`
- Avatars: `rounded-md` or `rounded-lg`
- Profile images: `rounded-lg`

**Rationale**: Data-dense interfaces (tables, admin, forms) communicate better with sharp edges. Rounding every component creates visual noise in text-heavy environments like Bible content.

---

## Surfaces and Cards

### Surface Hierarchy

| Surface | Class | When to use |
|---|---|---|
| Page background | `bg-background` | Always (subtle off-white `#FAFAFA` or true white `#FFFFFF`) |
| Content surface | `bg-background` | Default — typically same as page bg |
| Elevated surface | `bg-elevated` | Modals, drawers, popovers (1–2 shade difference from content) |
| Bordered surface | `border border-border` | Forms, tables, separated sections |
| Interactive surface | `hover:bg-primary/5` | Buttons, interactive cells |

### When a Card Should Exist

A card should exist **only** when it provides one of:

1. **Grouping related actions** (e.g., "Share" buttons around a verse)
2. **Visual separation of distinct contexts** (e.g., "Related devotionals" section)
3. **Interactive container** with hover/focus treatment
4. **Product/price grouping** in commerce areas

### When NOT to use a Card

- Wrapping a single paragraph or sentence
- Separating navigation items
- Creating "Card > Card > Card" stacking with no hierarchy
- Adding spacing (use margins instead)
- Decorating a list of metadata

Prefer fewer, meaningful surfaces over nested cards.

---

## Shadows

### Shadow Policy

- Shadows are allowed **only** when they communicate hierarchy or interaction
- Never as default decoration

### When Shadows Are Allowed

| Component | Shadow class |
|---|---|
| Modal/drawer backdrop | `shadow-sm` |
| Dropdown menus | `shadow-md` |
| Toast notifications | `shadow-lg` |
| Image lift (product justified) | `shadow-sm` on hover only |

### When Borders Replace Shadows

| Component | Instead of shadow |
|---|---|
| Tables | `border` / `divide-y divide-gray-100` |
| Navigation | active link underline only |
| Forms | input border focus ring |
| Data grids | `divide-y` only |

### Maximum Shadow Intensity

**Never** `shadow-2xl`, `shadow-3xl`, or larger. These are decorative.

Elevation should communicate hierarchy or interaction, not decoration.

---

## Typography

### Font Family

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
```

- Primary: `Inter` (system font stack)
- No decorative `font-display` variants
- Fallback: system fonts for speed

### Typography Hierarchy

| Scale | Element | Size | Line Height | Weight |
|---|---|---|---|---|
| `[1]` | Display / hero | `3rem (48px)` | `3.5rem (56px)` | `700` |
| `[2]` | Section heading | `2rem (32px)` | `2.25rem (36px)` | `600` |
| `[3]` | Page heading `<h1>` | `1.5rem (24px)` | `1.75rem (28px)` | `600` |
| `[4]` | Subheading `<h2>` | `1.25rem (20px)` | `1.5rem (24px)` | `500` |
| `[5]` | Body text | `1rem (16px)` | `1.5` | `400` |
| `[6]` | Small body | `0.875rem (14px)` | `1.25` | `400` |
| `[7]` | Caption / metadata | `0.75rem (12px)` | `1` | `400` |
| `[8]` | Nav links | `0.875rem (14px)` | `1.25` | `500` |
| `[9]` | Button text | `0.875rem (14px)` | `1.25` | `500` |
| `[10]` | Form labels | `0.875rem (14px)` | `1.25` | `500` |
| `[11]` | Numerical/data | `0.875rem (14px)` | `1` | `500` font-mono |
| `[12]` | Error messages | `0.875rem (14px)` | `1.25` | `400` |

### Font Weights

| Class | Value | Usage |
|---|---|---|
| `font-normal` | 400 | Body, caption, metadata |
| `font-medium` | 500 | Labels, nav, buttons, subheadings |
| `font-semibold` | 600 | Headings, section titles |
| `font-bold` | 700 | Display, strong headings |

**Never use** `font-thin`, `font-extralight`, `font-light`, `font-extrabold`, `font-black` in this codebase.

### Line Heights

- Body: `leading-relaxed` (~1.6) or `leading-1.5` (exact)
- Headings: proportional. Never less than `leading-snug` (1.25)
- Captions: `leading-tight` (1.25)

### Letter Spacing

No arbitrary `tracking-*`. Monospace for numbers only when precision matters.

### Avoiding Oversized Typography

- Heading `[1]` at `3rem` only on actual hero pages
- Interior page headings max `[3]` at `1.5rem (24px)`
- Body remains readable at `1rem (16px)`. Do not inflate to `1.25rem` or `1.5rem` globally

Typography should create hierarchy rather than simply making the interface look impressive.

### Numerical/Data Typography

- Monospace for numbers when precision matters (prices, dates, IDs)
- `font-mono` with `tabular-nums` feature for aligned columns

```html
<!-- Price column alignment -->
<span class="font-mono tabular-nums">₦2,500.00</span>
```

---

## Color System

### Semantic Color Tokens

Define all colors through semantic tokens. Never reference raw hex codes directly in components.

| Token | Value | CSS Variable | Usage |
|---|---|---|---|
| `background` | `#FFFFFF` | `--color-background` | Page background |
| `foreground` | `#111111` | `--color-foreground` | Primary text |
| `muted-foreground` | `#666666` | `--color-muted-foreground` | Secondary text, disabled |
| `border` | `#D1D5DB` | `--color-border` | Borders, dividers |
| `primary` | `#2563EB` | `--color-primary` | Primary actions, primary links |
| `primary-hover` | `#1D4ED8` | `--color-primary-hover` | Hover states |
| `secondary` | `#64748B` | `--color-secondary` | Secondary actions |
| `accent` | `#EF4444` | `--color-accent` | Highlights, errors when urgent |
| `destructive` | `#B42318` | `--color-destructive` | Delete actions, critical errors |
| `success` | `#059669` | `--color-success` | Successful payments, approval |
| `warning` | `#F59E0B` | `--color-warning` | Caution, expiring subscriptions |
| `informational` | `#0891B2` | `--color-informational` | Info badges, notes |
| `overlay` | `#00000055` | `--color-overlay` | Modal/drawer backdrops |

### Color Usage Rules

- **Primary**: buttons, primary links, active states
- **Secondary**: secondary actions, less prominent UI
- **Accent**: reserved for urgent/error highlights (max 1–2 per page)
- **Destructive**: delete, irreversible actions
- **Success**: payment completion, approval confirmations
- **Warning**: expiring, cautionary states
- **Informational**: badges, non-critical notes

### Gradient Policy

- Gradients are prohibited except when there is a clear product or brand purpose
- Bible commerce: no decorative gradients
- Exception: if brand has established gradient treatment, document it with justification

Solid colors only as default.

### Interactive States

| State | Class | Description |
|---|---|---|
| `hover` | `hover:bg-primary/10` | Background shift on hover |
| `focus` | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` | Visible focus ring |
| `active` | `active:opacity-90` | Press feedback |
| `selected` | `bg-primary/10 text-primary` | Selected items in lists |
| `disabled` | `opacity-50 cursor-not-allowed` | Disabled state styling |

### Disabled States

```css
opacity-50
cursor-not-allowed
bg-gray-100 for backgrounds
```

Do not remove click/tap — disable the action visually, don't hide it.

---

## Component Design Rules

### Buttons

#### Variants

| Variant | Class | Hover | Focus | Active | Disabled |
|---|---|---|---|---|---|
| Primary | `bg-primary text-white` | `hover:bg-primary/90` | `focus-visible:outline-2` | `active:opacity-90` | `opacity-50` |
| Secondary | `border border-primary text-primary` | `hover:bg-primary/5` | `focus-visible:outline-2` | `active:opacity-90` | `opacity-50` |
| Ghost | `underline text-primary` | `hover:text-primary/80` | `focus-visible:outline-2` | `active:opacity-90` | `opacity-50` |
| Link | `underline-offset-2 text-primary` | `hover:text-primary/80` | `focus-visible:outline-2` | `active:opacity-90` | `opacity-50` |

#### Constraints

- No `rounded-full` unless it's a pill for specific context (tag input, segmented control)
- No `px-6` as default. Use `px-4`
- Height: `h-10` (2.5rem) minimum. `h-12` (3rem) for primary CTA
- Text: `font-medium`. Never `font-bold` on buttons unless display size
- Width: `w-full` on small screens. Natural width on desktop

#### When NOT to use buttons

- Single actions in forms — use `<button type="submit">` styled as text
- Navigation — use `<a>` with link underline
- Read-only displays — plain text

### Links

- `text-primary underline-offset-2`
- Hover: `text-primary/80` or slight color shift
- Focus: `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`
- No underline on active/focus alone — underline only on hover, or decorative

#### When NOT to use links

- Buttons — use `<button>` element
- Form submissions — use `<button type="submit">`

### Inputs

```css
/* Base input class */
w-full px-4 py-3 border border-border rounded-md placeholder-muted-foreground
focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
```

| Part | Class |
|---|---|
| Input | `w-full px-4 py-3 border border-border rounded-md` |
| Label | `block text-sm font-medium text-foreground mb-1` |
| Error | `text-destructive text-sm mt-2` |
| Disabled | `opacity-50 cursor-not-allowed` |

Constraints:
- `rounded-md` only (4px radius)
- No `shadow` on inputs
- Focus ring: `focus:ring-primary/20` subtle. Not neon
- Height: `py-3` (24px) minimum
- Width: `w-full` on mobile. Natural on desktop

### Textareas

- Same base as inputs. But `min-h-[8rem]` and `resize-y`
- Same border/focus rules
- No `rounded-full` or `rounded-xl`

### Selects

- Same base as inputs for appearance
- Arrow indicator: `appearance-none bg-no-repeat bg-right-2.5 py-2 pr-8 pl-3`
- Focus same as inputs
- Single-select and multi-select distinction in labeling

### Checkboxes

- Native checkbox with custom label
- Size: `h-5 w-5` (20px) minimum
- Check: `h-4 w-4` inside
- Focus: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Indeterminate state: custom SVG or `checked:indeterminate`

### Radio Buttons

- Group with shared label
- Same size as checkboxes
- Selected: filled circle. Unselected: outline only

### Switches

When product requires toggle (theme, settings):

```css
h-6 w-11 /* 32x56px */
bg-gray-200 rounded-full /* track */
bg-white rounded-full /* thumb */
bg-primary /* checked track */
```

- Focus: same focus ring pattern
- Only for binary on/off toggles

### Tabs

- **Never** pill-shaped tabs as default
- Default: `text-sm font-medium border-b border-transparent hover:text-primary hover:border-primary`
- Active: `border-b-2 border-primary text-primary`
- Scrollable: horizontal scroll arrows `hidden sm:block`
- Never `rounded-full` on tabs

### Breadcrumbs

- `text-sm text-muted-foreground`
- Separator: `/` with `mx-1`
- Active page: `text-primary font-medium`. No underline
- Home: icon-only or `« Home`

### Dropdowns

- Trigger: same as input focus style
- Menu: `border border-border rounded-md bg-background shadow-sm`
- Items: `px-4 py-2 cursor-pointer hover:bg-primary/5 hover:text-primary`
- Separator: `my-1 border-t border-border`
- Disabled: `opacity-50 cursor-not-allowed`
- Focus ring on menu items: `focus-visible:outline-none`

### Modals

- **No card wrapper** around modal content
- Overlay: `fixed inset-0 bg-overlay backdrop-blur-sm`
- Modal content: `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background max-w-lg w-full mx-4 py-6 px-6 rounded-md shadow-lg`
- Header: `flex items-center justify-between pb-3 border-b border-border mb-4`
- Close button: `absolute top-4 right-4 p-2 rounded-md hover:bg-primary/5`
- Focus: same ring pattern. Escape key closes

### Tooltips

- `absolute z-10 text-sm max-w-xs py-2 px-2 rounded-md bg-foreground opacity-95`
- `shadow-sm` only on backdrop
- `data-[state=disabled]:opacity-50`
- Follow cursor. Arrow points to trigger

### Alerts

```css
border-l-4 border-destructive bg-destructive/10 text-destructive
px-4 py-3 rounded-md
role="alert"
```

- Dismissible: `×` with `aria-label="close alert"`
- Role-based: `role="alert"` for screen readers

### Badges

```css
inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
```

| Type | Class |
|---|---|
| Primary | `bg-primary/10 text-primary` |
| Secondary | `bg-secondary/10 text-secondary` |
| Success | `bg-success/10 text-success` |
| Warning | `bg-warning/10 text-warning` |
| Informational | `bg-informational/10 text-informational` |
| Destructive | `bg-destructive/10 text-destructive` |

### Tables

| Element | Style |
|---|---|
| Cell | `border-b border-border last:border-0` |
| Header | `border-b border-border font-medium text-sm text-foreground` |
| Row hover | `hover:bg-primary/5` (entire row) |
| Striped | `divide-y divide-gray-100` on tbody |
| Fixed columns | `first:font-medium first:text-muted-foreground` |
| Responsive scroll | `overflow-x-auto` on table wrapper |

Constraints:
- **NO cards around tables**
- **NO rounded corners on table cells** — `rounded-none` explicitly
- **NO shadows on table containers**
- Headers distinguish from data rows only via typography/border
- Hover on row only. Not individual cells

### Pagination

- `flex items-center justify-between px-4 py-3 border-t border-border`
- Page button: `px-3 py-1.5 text-sm font-medium hover:bg-primary/5`
- Current: `bg-primary text-white`
- Ellipsis: `...` as non-clickable text
- Previous/Next: `rounded-md` only on these buttons
- Disabled: `opacity-50 cursor-not-allowed`

### Navigation

- Horizontal bar below header
- Links: `text-muted-foreground hover:text-primary focus-visible:underline underline-offset-2`
- Active: `border-b-2 border-primary`
- Mobile drawer: same links. Vertical. Active state `text-primary`
- No pill shapes. No gradients. No shadows

### Cards

When a card IS used:

```css
rounded-md bg-background border border-border p-6
```

- `rounded-md` (4px) only
- No shadow
- No `px` or `py` auto-magic. Use explicit spacing
- `max-w-prose` on content inside if text-heavy

### Lists

- `list-disc pl-6` for unordered
- `list-decimal pl-6` for ordered
- `list-none` when no marker is needed (styled children only)
- No decorative icons unless product-justified

### Empty States

```css
flex flex-col items-center justify-center py-16 text-muted-foreground
```

- Icon: optional. Must be meaningful. Not decorative
- Title: `text-lg font-medium text-foreground mb-2`
- Description: `text-sm text-muted-foreground`
- Primary action: single button if needed. Positioned below
- **Never** stack multiple cards in empty state

### Loading States

- Skeleton: `animate-pulse bg-gray-100 rounded-md` (same shape as content)
- Full-page: `min-h-screen flex items-center justify-center`
- Button: `disabled opacity-50` with spinner inline
- Never remove content — show loading around it

### Notifications (Toasts)

```css
fixed top-4 right-4 z-50 bg-foreground text-background rounded-md p-4 shadow-sm
max-w-md
```

- Auto-dismiss after 5 seconds (configurable)
- Variants: success, error, warning, informational — each with respective color token

---

## Data-Dense Interfaces

### Tables (Priority over cards)

- **Never** wrap a table in a card
- **Never** add `rounded-lg` or `rounded-xl` to table cells
- **Never** add shadow to table containers
- Use `divide-y divide-gray-100` for row separation
- Hover: `hover:bg-primary/5` on entire row. Not individual cells
- Fixed first column for identifiers (name, ID) with `font-medium`
- Alternating row stripes: `divide-y divide-gray-100` or `bg-gray-50` on odd rows

### Dashboards / Admin Panels

- Grid only where it communicates data better than cards
- Default: single-column stack on all screens
- Use headers to distinguish sections. Not card wrappers
- Action buttons inline with data. Not in separate card

### Product Catalogs

- Grid only when products are the primary focus
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Product image: `rounded-sm` only if showing product photo
- Price: never inside card. Inline with product title
- Action: `button` inline. Not in separate card

Do not turn every data point into a visually separated card.

### Analytics / Metrics

- KPI boxes: at most one `border-l-4 accent-color` accent. Not card-wrapped
- Metrics in a row: inline `flex`. Not separate containers
- Trend arrows: `inline-flex items-center gap-1 text-sm`

---

## Responsive Design

### Breakpoints

Based on Tailwind's convention:

| Class | Screen |
|---|---|
| `sm:` | 640px (min-width for tablet) |
| `md:` | 768px (min-width for desktop) |
| `lg:` | 1024px (min-width for large desktop) |
| `xl:` | 1280px (min-width for full desktop) |

### Desktop (1280px+)

- Full grid. 2-column layout where appropriate
- Horizontal navigation
- Tables: visible scroll only if needed. Otherwise inline

### Tablet (640px – 1279px)

- Grid: `grid-cols-1 md:grid-cols-2` where appropriate
- Navigation: horizontal → hamburger drawer
- Tables: `overflow-x-auto` with sticky headers
- Sidebar: collapsed or hidden. Primary actions inline

### Mobile (below 640px)

- **Single column** on everything
- Navigation: full-screen drawer
- Grid: `grid-cols-1`. `gap-3`
- Tables: horizontal `overflow-x-auto`. Column stacking via CSS
- Font size: one step smaller than desktop scale
- Touch targets: minimum 44×44px (`h-14 w-14`)

### Navigation Transformations

| Screen | Navigation Style |
|---|---|
| Desktop | Horizontal bar. Active underline |
| Tablet | Hamburger → drawer |
| Mobile | Full-screen drawer. Close button |

### Grid Transformations

| Screen | Columns |
|---|---|
| Mobile | 1 |
| Tablet | 1. 2 if content allows |
| Desktop | 2–4 depending on component |

### Table Behavior

| Screen | Behavior |
|---|---|
| Desktop | Fully visible. Column headers persistent |
| Tablet | Horizontal scroll if > 6 columns. Otherwise stacked |
| Mobile | Horizontal scroll. Minimal visible columns |

### Content Priority

- **Desktop**: full information density
- **Tablet**: condensed. Some hierarchy reduction
- **Mobile**: essential actions and identifiers only. Rest via drill-down

### Spacing Changes

| Screen | Gap |
|---|---|
| Desktop | `gap-6` |
| Tablet | `gap-4` |
| Mobile | `gap-3` |

### Typography Changes

| Screen | Body text |
|---|---|
| Desktop | `1rem (16px)` |
| Tablet | `0.875rem (14px)` |
| Mobile | `0.875rem (14px)` |

### Control Sizing

- Touch targets: minimum 44px hit area
- Inputs: `py-3` desktop → `py-2` mobile with larger font
- Buttons: `h-10` desktop → `h-12` mobile primary

Responsive design should preserve functionality. Not simply preserve appearance.

---

## Interaction Design

### Hover States

| Element | Hover behavior |
|---|---|
| Buttons | Background 10% lighter |
| Links | Underline appears or deepens |
| Inputs | No hover shadow. Focus ring is primary cue |
| Table rows | `bg-primary/5` on entire row |
| Badges | No hover unless interactive |

**Never** `scale-up` or `transform` on hover unless functional.

### Focus States

All focusable elements must have visible focus indicators:

```css
focus-visible:outline
focus-visible:outline-2
focus-visible:outline-offset-2
focus-visible:outline-primary
```

- **All interactive elements**: `focus-visible:outline-2 focus-visible:outline-primary`
- **Inputs**: `focus:ring-2 focus:ring-primary/20`
- **Buttons**: `focus-visible:outline-2 focus-visible:outline-primary`
- **Navigation links**: `focus-visible:underline`
- **Never** `outline-none` without equivalent focus indicator. Accessibility requirement

### Active States

| Element | Active behavior |
|---|---|
| Buttons | `active:opacity-90` (press feedback) |
| Links | No transform. Underline remains |

**Never** `translate-y-1` or similar press animations unless justified.

### Disabled States

```css
opacity-50
cursor-not-allowed
pointer-events-none
```

Visual greying only. Not hidden.

### Loading States

| Element | Loading behavior |
|---|---|
| Buttons | Spinner inline. `disabled opacity-50` |
| Tables | Skeleton rows matching column count |
| Full page | Overlay with spinner. Content underneath dimmed |
| Toasts | Spinner with message. Auto-dismiss |

### Transitions

- **Allowed**: `transition-colors 150ms ease-in-out`, `transition-opacity 150ms ease-in-out`
- **Prohibited**: `transition-property: all`, `duration-300+` on every element
- **Purpose**: subtle feedback. Not spectacle

### Animation Principles

- Animations must have a **functional purpose**
- Prefer subtle feedback over spectacle

**Avoid:**
- Decorative floating elements
- Unnecessary motion
- Animation on every component

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0s !important;
    animation-duration: 0s !important;
  }
}
```

Apply globally at root level.

---

## Accessibility

### Keyboard Navigation

- `tabindex` only when necessary. Never `tabindex="0"` on non-interactive
- Logical tab order: navigation → main content → forms → footer
- `focus-visible` styles on all interactive elements
- `Shift+Tab` reverse navigation works

### Visible Focus States

- **Never** `outline-none` without equivalent focus indicator
- Minimum: `outline-2` in color that contrasts with background
- Preferred: `outline-2 outline-primary outline-offset-2`
- Focus rings must be visible on all browsers and OS themes

### Color Contrast

- **Foreground vs. background**: minimum 4.5:1 AA. 3:1 AA large text
- **UI components**: 3:1 minimum for border/button edges
- Use `color-contrast()` utility when available. Otherwise manual verification
- Test with: Chrome DevTools → Accessibility → Contrast

### Semantic HTML

Use proper HTML elements. Don't fake semantics with divs.

| Use | For |
|---|---|
| `<h1>`–`<h6>` | Headings in hierarchical order. Never skip levels |
| `<nav>` | Navigation landmark |
| `<main>` | Main content landmark |
| `<footer>` | Footer landmark |
| `<button>` | Actions |
| `<a>` | Links with `href` |
| `<form>` | Wrapping form controls |
| `<label>` | Associated with input via `for` or nesting |
| `<table>` | Tabular data only. Never layout |

### Form Labeling

- `<label>` always associated with input via:
  - `for` matching `id`, OR
  - nesting `<label>` around input
- Never rely on placeholder as label
- Error messages linked to input via `aria-describedby`

### Screen Reader Considerations

| Attribute | Purpose |
|---|---|
| `aria-label` | When visible label isn't possible |
| `aria-describedby` | Error messages + supplemental info |
| `role="alert"` | Dynamic error/toast messages |
| `aria-expanded` | Accordions. Dropdowns |
| `aria-controls` | When element controls another |
| Landmarks | `header`, `nav`, `main`, `footer` |

### Reduced-Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
  }
}
```

Test by enabling reduced motion in OS settings.

### Touch Target Sizing

- Minimum 44×44px for all touch targets
- Equivalent: `h-14 w-14` (3.5rem square) or `h-12 w-12` (3rem) with generous padding
- Buttons: `h-12` minimum on mobile
- Links: ensure hit area is 44px even if text is smaller
- Inputs: `py-3` ensures touch target

### Error Communication

- **Inline**: `text-destructive text-sm mt-2` below input
- **Non-field**: toast/alert at top of form
- **`aria-invalid`** on input with `aria-describedby` pointing to error
- **`role="alert"`** for form-level errors
- **Focus return** to first error on submit

Accessibility is part of the design system. Not an optional detail.

---

## Design Anti-Patterns

### 1. Card Everything

Do not wrap every piece of content in a card.

### 2. Radius Everywhere

Do not give every component large rounded corners.

### 3. Decorative Gradients

Do not add gradients without product or brand reason.

### 4. Excessive Shadows

Do not use shadows as default method of creating hierarchy.

### 5. Giant Hero Sections

Do not create oversized hero sections when product doesn't require them.

### 6. SaaS Template Syndrome

Do not automatically turn the product into a generic SaaS dashboard.

### 7. Excessive Whitespace

Whitespace should improve hierarchy. Not reduce useful information density.

### 8. Component Soup

Do not break simple content into unnecessary nested components purely for visual separation.

### 9. Icon Decoration

Do not add icons merely because empty space exists.

### 10. AI-Style Repetition

Avoid repeatedly applying the same visual pattern to every page.

### 11. Screenshot-Driven Design

Interface must be designed for real interaction. Not just attractive screenshots.

### 12. Library Defaults

Do not blindly accept default styles from shadcn/ui, Material UI, Chakra, etc.

---

## Design Tokens

### Colors

```css
:root {
  --color-background: #ffffff;
  --color-foreground: #111111;
  --color-muted-foreground: #666666;
  --color-border: #d1d5db;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #64748b;
  --color-accent: #ef4444;
  --color-destructive: #b42318;
  --color-success: #059669;
  --color-warning: #f59e0b;
  --color-informational: #0891b2;
  --color-overlay: #00000055;
}
```

### Spacing

Tailwind's default spacing scale. No arbitrary values.

| Token | Value |
|---|---|
| `0.25rem` | `p-1` (4px) |
| `0.5rem` | `p-2` (8px) |
| `0.75rem` | `p-3` (12px) |
| `1rem` | `p-4` (16px) |
| `1.5rem` | `p-6` (24px) |
| `2rem` | `p-8` (32px) |

### Typography

```css
:root {
  --font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji",
    "Segoe UI Emoji", "Segoe UI Symbol";
  
  --font-size-display: 3rem;       /* 48px - hero only */
  --font-size-section: 2rem;       /* 32px */
  --font-size-h1: 1.5rem;          /* 24px */
  --font-size-h2: 1.25rem;         /* 20px */
  --font-size-body: 1rem;          /* 16px */
  --font-size-small: 0.875rem;     /* 14px */
  --font-size-caption: 0.75rem;    /* 12px */
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;
  --line-height-tight: 1.25;
}
```

### Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.125rem;   /* 2px */
  --radius-md: 0.25rem;    /* 4px */
  --radius-lg: 0.5rem;     /* 8px */
}
```

### Borders

```css
:root {
  --border-width: 1px;
  --border-color: #d1d5db;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
```

### Breakpoints

Tailwind's default breakpoints. No custom values.

| Token | Screen |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

### Transitions

```css
:root {
  --transition-fast: 150ms ease-in-out;
  --transition-medium: 250ms ease-in-out;
}
```

Never animate `all`. Never chain more than 2 transition properties.

---

## Implementation Rules for AI Coding Agents

1. **Read `DESIGN.md` before creating or modifying UI.**
2. **Follow the existing design tokens.** No arbitrary values.
3. **Reuse existing components before creating new ones.**
4. **Avoid creating duplicate components with slightly different styling.**
5. **Do not introduce new visual patterns without justification.**
6. **Do not add arbitrary rounded corners.**
7. **Do not add arbitrary shadows.**
8. **Do not introduce gradients without a reason.**
9. **Do not add decorative UI elements solely to make the page look impressive.**
10. **Preserve visual consistency with existing screens.**
11. **Prefer simple layouts when they communicate information better.**
12. **Consider responsive behavior before implementing desktop layouts.**
13. **Consider accessibility before implementation.**
14. **Avoid unnecessary dependencies for visual effects.**
15. **Do not redesign unrelated parts of the application.**

> Does this solve a product problem, or is it merely visual decoration?

---

## Visual Consistency Rules

### Spacing Consistency

- All horizontal margins/paddings use Tailwind spacing tokens (`p-1` through `p-8`). Never arbitrary
- Vertical rhythm: 4px baseline. `space-y-2` between paragraphs. `mt-8` between sections
- Never mix `px-4` and `px-6` on sibling elements without reason

### Component Sizing

| Component | Size |
|---|---|
| Buttons | `h-10` desktop. `h-12` mobile primary |
| Inputs | `py-3` desktop. `py-2` mobile |
| Selects | Same height as inputs |
| Checkboxes/Radio | `h-5 w-5` minimum |
| Switches | `h-6 w-11` |

### Icon Sizing

| Context | Icon size |
|---|---|
| Inline with text | `h-4 w-4` or `h-5 w-5` |
| Buttons/nav | `h-5 w-5` or `h-6 w-6` |
| Badges | Proportional to text size |
| Close buttons | `p-2` (44×44px hit area) |

### Button Hierarchy

| Level | Variant | Priority |
|---|---|---|
| Primary | `bg-primary text-white` | Highest |
| Secondary | `border border-primary text-primary` | Medium |
| Ghost | `underline text-primary` | Low |
| Link | `underline-offset-2 text-primary` | Lowest |

Never have more than one primary button per view.

### Text Hierarchy

Use proper heading levels. Never skip from `<h1>` to `<h4>`.

| Level | Element |
|---|---|
| Display | Only on hero pages |
| Page heading | `<h1>` |
| Section heading | `<h2>` |
| Subheading | `<h3>` |
| Subsection | `<h4>` |
| Body | `<p>` |
| Caption | `<span class="text-caption">` |

### Border Usage

- Borders: `1px solid color-border` on inputs, tables, sections
- Focus rings: `outline-2 outline-primary outline-offset-2`
- Table cell borders: `divide-y divide-gray-100`
- Never `2px` or `3px` borders unless explicitly justified

### Surface Hierarchy

1. **Page background**: `bg-background`
2. **Content surface**: same. Or 1 shade lighter
3. **Elevated surface**: modal/drawer `bg-background` with distinction
4. **Bordered surface**: `border border-border` instead of elevation

### Alignment

- Text: `left` unless `-center` or `right` is product-justified
- Form labels: `block` above input on mobile. `block inline-flex` side-by-side on desktop
- Tables: left-aligned text. Right-aligned numbers/prices

### Grid Behavior

| Screen | Gap | Columns |
|---|---|---|
| Mobile | `gap-3` | 1 |
| Tablet | `gap-4` | 1–2 |
| Desktop | `gap-6` | 2–4 |

Never use grid merely for visual separation.

### Responsive Behavior

See **Responsive Design** section.

---

## Page-Level Design Rules

### Listing Pages (Product/Content Catalog)

- Header with page title and optional filters
- Grid of items: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Each item: **no card wrapper**. Just content with spacing
- Price/essential info inline with title. Not separate element
- Action buttons below or inline. Not in separate card
- Pagination at bottom
- Sidebar on desktop for filters. Hidden on tablet/mobile

### Detail Pages (Product/Content View)

- Header with breadcrumb and page title
- Main content area: no card wrapper
- Image at top with `rounded-sm` only if product photo
- Metadata (price, rating, tags) inline beneath header
- Content: body text with proper typography hierarchy
- Related items section: no card wrapper. Just section heading + grid
- Action: primary button for purchase. Secondary for cancel/back

### Forms

- Single-column layout on all screens
- Labels above inputs (mobile). Side-by-side (desktop with `grid-cols-2`)
- Error messages inline below respective fields
- Primary action button at bottom. Full width
- No card wrapper. Use `max-w-md mx-auto` if centering needed
- Footer with secondary links (terms. cancel)

### Authentication (Login/Register)

- Minimal UI. No decorative elements
- Form with labels. Inputs. Primary/secondary actions
- Links: "Forgot password?" "Create account"
- No hero section. No gradients. No cards
- Focus rings visible. Error communication clear

### Account Pages

- Navigation sidebar (desktop). Drawer (mobile)
- Sections: order history. subscriptions. payment methods. settings
- Each section: heading + content area. No card wrapper
- Action buttons inline or at section footer
- Table for order history/history lists. No cards

### Settings Pages

- Navigation as above
- Sections grouped by function (profile. security. payments. notifications)
- Toggle switches where appropriate
- Forms within sections. Same rules as Forms
- Danger section for delete/account closure with warning

### Admin Pages

- Tables for all data lists. No card wrappers
- Action buttons inline with rows
- Bulk actions at top of tables
- Navigation sidebar
- Modals for create/edit operations. Same modal spec
- No decorative elements. Functional UI only

### Search Pages

- Search bar at top. Full width
- Results grid: same as listing pages. No card wrappers
- No results state: empty state spec with suggestion text
- Filters sidebar (desktop only). Hidden mobile
- Sorting/pagination at bottom

### Error Pages (404. 500)

- Minimal design. No cards. No gradients
- Title: large but appropriate. Not hero-sized
- Navigation link back to home
- Optional illustration if product-justified. Not decorative
- No countdown timers. No auto-redirects without user control

### Empty States

See **Empty States** component spec.

- No card wrapper
- Meaningful graphic/icon if used
- Title. description. primary action if applicable
- Consistent across all empty states

---

## Real-World Design Principle

**Function → hierarchy → usability → consistency → aesthetics**

not:

**aesthetics → decoration → trends → usability**

The UI should look like a deliberate product created by an experienced design team. Not a generated collection of fashionable UI patterns.

---

## Cross-Check Against Codebase

| Check | Status |
|---|---|
| Next.js 16.3.4 + React 19 | Compatible |
| Path aliases `@/*` and `@shared/*` | Referenced in token section |
| Auth.js JWT strategy | Documented in form rules |
| Paystack + Stripe payments | Referenced in commerce context |
| Sanity CMS content | Mentioned in content context |
| Meilisearch search adapter | Compatible (Tailwind tokens) |
| Vercel deployment | No conflicts |
| ESLint flat config | No conflicts |
| No existing UI components | Starting from zero. Clean slate |

Document is internally consistent. No contradictions found.
