"use client";

import { useEffect, useState } from "react";

/**
 * Seconds left before a resend is allowed (A03, A05: 60 s). The server
 * enforces the cooldown; this only keeps the button honest.
 */
export function useCooldown(initialSeconds = 0) {
  const [until, setUntil] = useState(() => (initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const timer = setTimeout(() => { setNow(Date.now()); }, 1000);
    return () => { clearTimeout(timer); };
  }, [until, now]);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  return {
    remaining,
    start(seconds: number) {
      const at = Date.now();
      setNow(at);
      setUntil(at + seconds * 1000);
    },
  };
}
