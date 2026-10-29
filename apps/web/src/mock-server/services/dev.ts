// DELETE-ME-LATER: actions behind the DevToolbar.
import type { IdentityOption } from "@/lib/dev/scenario-defs";
import { createSession } from "./auth";
import { adjustRating } from "./reviews";
import type { Db } from "../types";

const IDENTITY_USER_IDS: Record<Exclude<IdentityOption, "signed-out">, string> = {
  customer: "cus_jordan",
  unverified: "cus_robin",
  "staff:catalog_editor": "stf_catalog",
  "staff:fulfillment": "stf_fulfillment",
  "staff:content_editor": "stf_content",
  "staff:support": "stf_support",
  "staff:admin": "stf_alex",
};

/** Returns the new session id, or null for "signed out". */
export function switchIdentity(db: Db, identity: IdentityOption, at: Date): string | null {
  if (identity === "signed-out") return null;
  const user = db.users.find((u) => u.id === IDENTITY_USER_IDS[identity]);
  if (!user) throw new Error(`Seed is missing the user for identity ${identity}`);
  return createSession(db, user, at);
}

export function identityOfUser(userId: string | null): IdentityOption {
  if (!userId) return "signed-out";
  const match = Object.entries(IDENTITY_USER_IDS).find(([, id]) => id === userId);
  return (match?.[0] as IdentityOption | undefined) ?? "signed-out";
}

/** Moderation isn't wireframed (spec §5.11): publish every pending review. */
export function approvePendingReviews(db: Db): number {
  const pending = db.reviews.filter((r) => r.status === "pending");
  for (const review of pending) {
    review.status = "published";
    adjustRating(db, review.productSlug, review.rating, 1);
  }
  return pending.length;
}

export function cartCount(db: Db, cartToken: string | undefined): number {
  const cart = db.carts.find((c) => c.token === cartToken);
  return cart ? cart.lines.reduce((sum, line) => sum + line.quantity, 0) : 0;
}
