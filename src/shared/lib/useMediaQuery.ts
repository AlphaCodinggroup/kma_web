"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Snapshot inicial estable: el navegador adapta el contenido tras hidratar. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window.matchMedia !== "function") return () => {};
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  const snapshot = useCallback(() => typeof window.matchMedia === "function" ? window.matchMedia(query).matches : serverValue, [query, serverValue]);
  const serverSnapshot = useCallback(() => serverValue, [serverValue]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
