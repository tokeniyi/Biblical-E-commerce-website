"use client";

import { OPEN_CONSENT_EVENT } from "./AnalyticsProvider";

/** Footer control that reopens the consent panel to change or withdraw consent. */
export function CookieSettingsButton() {
  return (
    <button type="button" className="hover:text-brand" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Cookie settings
    </button>
  );
}
