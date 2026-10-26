/**
 * Shared class names for the wireframe primitives drawn in Figma: the
 * filled primary action, the outlined secondary action, panels and the
 * gray status message box.
 */
export const primaryButton =
  "inline-flex min-h-10 items-center rounded-[3px] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-line disabled:bg-band disabled:text-muted";

export const secondaryButton =
  "inline-flex min-h-10 items-center rounded-[3px] border border-ink bg-white px-4 py-2.5 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:border-line disabled:text-muted";

export const textLink = "text-sm underline";

export const panel = "flex flex-col gap-3 border border-line bg-white p-4";

export const statusBox = "flex flex-col border border-line bg-panel p-3.5";

/** Labeled input box: bold label above the control, as in the Figma "Labeled input". */
export const fieldBox = "flex flex-col gap-1 border border-line bg-white p-2.5 text-sm";

export const fieldLabel = "font-semibold";
