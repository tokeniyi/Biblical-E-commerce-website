"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ConsentChoice } from "@/lib/analytics/consent";
import { Icon } from "@/components/ui/Icon";

type ConsentBannerProps = {
  choice: ConsentChoice | null;
  onDecide: (choice: ConsentChoice) => void;
  onClose: () => void;
};

const choiceButton =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-ink px-4 text-sm font-semibold text-ink hover:bg-ink hover:text-white";

/**
 * Non-blocking consent panel. Accept and Reject carry equal weight (same
 * style, same size) and nothing is pre-ticked. Strictly necessary cookies
 * (cart, session, this choice) are always on and listed for transparency.
 */
export function ConsentBanner({ choice, onDecide, onClose }: ConsentBannerProps) {
  const titleId = useId();
  const [customizing, setCustomizing] = useState(choice !== null);
  const [analytics, setAnalytics] = useState(choice === "granted");

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="animate-slide-up fixed inset-x-3 bottom-3 z-50 max-h-[80vh] overflow-y-auto rounded-2xl border border-line bg-white p-5 text-sm shadow-lift sm:left-4 sm:right-auto sm:max-w-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="cookie" className="h-5 w-5 text-gold" />
          Help us improve the store
        </h2>
        {choice !== null ? (
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-band" aria-label="Close cookie settings">
            <Icon name="x" />
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-muted">
        With your permission we record how pages are used (pages visited, clicks, scroll depth, time on page) to find
        and fix confusing parts of the store. We never record what you type, your name or email, and we don’t share it
        with advertisers. <Link href="/help/privacy" className="font-medium text-brand underline">Privacy &amp; cookies</Link>
      </p>

      {customizing ? (
        <fieldset className="mt-4 flex flex-col gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 font-semibold">Cookie categories</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked disabled className="mt-0.5" />
            <span>
              <span className="font-semibold">Strictly necessary</span> — always on
              <span className="block text-muted">Cart, sign-in session and remembering this choice.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={analytics} onChange={(e) => { setAnalytics(e.target.checked); }} className="mt-0.5" />
            <span>
              <span className="font-semibold">UX analytics</span>
              <span className="block text-muted">First-party cookies _bs_vid (180 days) and _bs_sid (30 minutes).</span>
            </span>
          </label>
          <button type="button" className={choiceButton} onClick={() => { onDecide(analytics ? "granted" : "denied"); }}>
            Save choices
          </button>
        </fieldset>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" className={choiceButton} onClick={() => { onDecide("denied"); }}>
          Reject analytics
        </button>
        <button type="button" className={choiceButton} onClick={() => { onDecide("granted"); }}>
          Accept analytics
        </button>
      </div>
      {!customizing ? (
        <button type="button" className="mt-3 text-sm font-medium text-ink underline underline-offset-4" onClick={() => { setCustomizing(true); }}>
          Customize
        </button>
      ) : null}
    </section>
  );
}
