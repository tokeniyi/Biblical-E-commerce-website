"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { primaryButton, textLink } from "@/components/ui/styles";
import { StatusMessage } from "@/components/ui/StatusMessage";

/**
 * E18 Network error for page reads. Retrying re-runs the same route (reads
 * are safe to retry; payment writes use E15 instead).
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function retry() {
    if (onRetry) {
      onRetry();
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }
  return (
    <section data-state="E18" className="flex flex-col gap-3.5">
      <StatusMessage role="alert" title="We couldn’t load this information">
        Check your connection and try again. Filters and saved cart are unchanged.
      </StatusMessage>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} disabled={pending} onClick={retry}>
          {pending ? "Retrying…" : "Retry"}
        </button>
        <Link href="/" className={textLink}>
          Back to home
        </Link>
      </div>
    </section>
  );
}
