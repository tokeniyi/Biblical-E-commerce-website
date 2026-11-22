"use client";

import { useEffect } from "react";
import type { AnalyticsEventType, AnalyticsProps } from "@your-app/shared";
import { track } from "@/lib/analytics/tracker";

/**
 * Records one event when a server-rendered page mounts (e.g. a search with
 * its result count, or a confirmed purchase). No-op without consent.
 */
export function TrackEvent({ type, props, onceKey }: { type: AnalyticsEventType; props?: AnalyticsProps; onceKey?: string }) {
  const serialized = JSON.stringify(props ?? {});
  useEffect(() => {
    if (onceKey) {
      try {
        const key = `bs_tracked_${onceKey}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // Storage unavailable: record anyway.
      }
    }
    // Let the page_view for this route go first.
    const id = window.setTimeout(() => { track(type, JSON.parse(serialized) as AnalyticsProps); }, 50);
    return () => { window.clearTimeout(id); };
  }, [type, serialized, onceKey]);
  return null;
}
