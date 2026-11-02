"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

const CHANGE_EVENT = "kma:url-parameter-change";
const snapshot = () => window.location.search;
const serverSnapshot = () => "";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Conserva filtros en la URL sin pedir de nuevo la página por cada tecla. */
export function useUrlParameter(name: string, defaultValue = ""): [string, (value: string) => void] {
  // El contexto también cambia al navegar a una página que Next ya tiene en caché.
  // La URL actual conserva cada tecla mientras el router procesa esa actualización.
  const routerSearch = useSearchParams()?.toString() ?? "";
  const search = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  // HistoryUpdater escribe la URL al confirmar el render, después de leer el contexto.
  useEffect(() => {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [routerSearch]);
  const value = new URLSearchParams(search).get(name) ?? defaultValue;
  const setValue = useCallback((nextValue: string) => {
    const url = new URL(window.location.href);
    if (!nextValue || nextValue === defaultValue) url.searchParams.delete(name);
    else url.searchParams.set(name, nextValue);
    // Next repone sus claves internas: reenviarlas salta la actualización del router.
    const historyState: Record<string, unknown> = { ...(window.history.state ?? {}) };
    delete historyState.__NA;
    delete historyState._N;
    delete historyState.__PRIVATE_NEXTJS_INTERNALS_TREE;
    window.history.replaceState(historyState, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [name, defaultValue]);
  return [value, setValue];
}
