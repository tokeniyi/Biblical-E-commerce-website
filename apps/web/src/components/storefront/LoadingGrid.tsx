"use client";

import { useRouter } from "next/navigation";
import { textLink } from "@/components/ui/styles";

/**
 * E16 Loading product grid. Reserves the card geometry, marks the region
 * busy and announces the load; the result count is hidden rather than
 * shown stale.
 */
export function LoadingGrid({ cancellable = true }: { cancellable?: boolean }) {
  const router = useRouter();
  return (
    <div data-state="E16" className="flex flex-col gap-3.5">
      <p role="status" className="text-base font-semibold">
        Loading Bibles…
      </p>
      <div aria-busy="true" aria-label="Loading results" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-[388px] flex-col gap-3 border border-line p-3">
            <div className="h-36 bg-band" />
            <div className="h-3.5 bg-band" />
            <div className="h-2.5 bg-band" />
            <div className="h-2.5 w-2/3 bg-band" />
          </div>
        ))}
      </div>
      {cancellable ? (
        <button
          type="button"
          className={`${textLink} self-start`}
          onClick={() => {
            router.back();
          }}
        >
          Cancel / back
        </button>
      ) : null}
    </div>
  );
}
