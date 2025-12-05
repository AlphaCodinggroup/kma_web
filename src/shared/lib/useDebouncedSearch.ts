import { useEffect, useState } from "react";

export interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
}

/**
 * Hook genérico para debouncEAR búsquedas de texto.
 *
 * - Normaliza el valor a minúsculas y trim.
 * - Solo emite un valor si length >= minLength (por defecto 2).
 * - Aplica debounce (por defecto 300ms).
 */
export function useDebouncedSearch(
  rawQuery: string,
  options?: UseDebouncedSearchOptions,
): string {
  const { delay = 300, minLength = 2 } = options ?? {};

  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  useEffect(() => {
    const normalized = rawQuery.trim().toLowerCase();

    // Si no llega al mínimo de caracteres, vaciamos el valor debounced
    if (normalized.length < minLength) {
      setDebouncedQuery("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalized);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [rawQuery, delay, minLength]);

  return debouncedQuery;
}
