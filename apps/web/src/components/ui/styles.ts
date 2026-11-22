/**
 * Shared class names for the design-system primitives: the filled primary
 * action, the outlined secondary action, panels, fields and status boxes.
 */
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

export const primaryButton = `${buttonBase} border border-brand bg-brand text-white hover:border-brand-dark hover:bg-brand-dark disabled:border-line disabled:bg-band disabled:text-muted`;

export const secondaryButton = `${buttonBase} border border-ink/25 bg-white text-ink hover:border-ink hover:bg-panel disabled:border-line disabled:text-muted`;

export const ghostButton =
  "inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-band";

export const textLink = "text-sm font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand";

export const panel = "flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-card";

export const statusBox = "flex flex-col gap-1 rounded-xl border border-line bg-panel p-4";

/** Labeled input: label above the control. */
export const fieldBox = "flex flex-col gap-1.5 text-sm";

export const fieldLabel = "font-semibold text-ink";

export const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-gold";

export const displayHeading = "font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl";

export const pageHeading = "font-display text-3xl font-semibold tracking-tight text-ink";

export const badge = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";

export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
