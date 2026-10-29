/**
 * Non-sensitive form drafts kept across a forced sign-in (E11 / A14:
 * "preserve non-sensitive draft only"). sessionStorage, so it never
 * outlives the tab; never used for passwords or payment data.
 */
const PREFIX = "draft:";

export function saveDraft(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the draft is a convenience.
  }
}

/** Reads and removes the draft, so it is restored once. The caller knows its shape. */
export function takeDraft(key: string): unknown {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    sessionStorage.removeItem(PREFIX + key);
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
