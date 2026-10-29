"use client";

import { useEffect, useState } from "react";

/**
 * False until React has hydrated. Checkout controls stay disabled until then:
 * a click before hydration would be lost, and a form submitted natively would
 * put what was typed (addresses, card numbers) in the URL.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
