"use client";

import { useSearchParams } from "next/navigation";
import type { PendingSaveResult } from "@your-app/shared";
import { StatusMessage } from "@/components/ui/StatusMessage";

const PARAM = "wishlist";

/**
 * After sign-in, the ♡ tap made while signed out is saved by the server.
 * If it couldn't be (the edition left sale), the page says so instead of
 * pretending; a successful save needs no notice, the ♥ shows it.
 */
export function withWishlistNotice(returnTo: string, pendingSave: PendingSaveResult | null): string {
  if (!pendingSave || pendingSave.saved) return returnTo;
  const [path = returnTo, hash] = returnTo.split("#");
  const url = `${path}${path.includes("?") ? "&" : "?"}${PARAM}=not-saved`;
  return hash ? `${url}#${hash}` : url;
}

export function WishlistNotice() {
  const params = useSearchParams();
  if (params.get(PARAM) !== "not-saved") return null;
  return (
    <div className="px-6 pt-4">
      <StatusMessage role="alert" title="We couldn’t save that Bible to your wishlist">
        That edition isn’t available any more, so it wasn’t saved. You’re signed in.
      </StatusMessage>
    </div>
  );
}
