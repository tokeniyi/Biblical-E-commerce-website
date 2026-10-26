import { serverApi } from "./server";

/** Who is browsing, for ♡ Save buttons and review eligibility copy. */
export type Viewer =
  | { kind: "signed-out" }
  | { kind: "customer"; name: string; wishlist: string[] };

/**
 * Staff sessions browse the storefront as signed out: the wishlist is a
 * customer feature. If the session or wishlist can't be read, the page still
 * renders and the ♡ button falls back to "sign in".
 */
export async function loadViewer(): Promise<Viewer> {
  try {
    const api = await serverApi();
    const { session } = await api.getSession();
    if (session.kind !== "customer") return { kind: "signed-out" };
    const { skus } = await api.wishlist.get();
    return { kind: "customer", name: session.name, wishlist: skus };
  } catch {
    return { kind: "signed-out" };
  }
}
