import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import {
  EMPTY_AUDIT_FILTERS,
  parseAuditFilters,
  sanitizeAuditFilters,
  serializeAuditFilters,
  type AuditFilterOptions,
  type AuditFilters,
} from "@widgets/project-detail/lib/audit-filters";

/**
 * Filtros de las auditorías del proyecto, reflejados en la URL.
 *
 * La URL se lee al montar (así Back desde el QC vuelve con los mismos filtros)
 * y se reescribe con `history.replaceState`, que Next sincroniza sin volver a
 * pedir la página al servidor en cada tecla.
 */
export function useProjectAuditFilters(options: AuditFilterOptions) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [raw, setRaw] = useState<AuditFilters>(() =>
    searchParams ? parseAuditFilters(searchParams) : EMPTY_AUDIT_FILTERS
  );

  // Los valores desconocidos se ignoran; `raw` los conserva hasta que las
  // opciones terminan de cargar.
  const filters = useMemo(() => sanitizeAuditFilters(raw, options), [raw, options]);
  const query = useDebouncedSearch(filters.query);
  const isFiltering =
    query !== "" || Boolean(filters.facility || filters.flow || filters.status);
  const hasValues = isFiltering || filters.query.trim() !== "";
  const queryString = serializeAuditFilters(filters);

  // Sólo se escribe después de un cambio del usuario, no al montar.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current || !pathname) return;
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(window.history.state, "", url);
  }, [pathname, queryString]);

  const setFilter = useCallback((key: keyof AuditFilters, value: string) => {
    touched.current = true;
    setRaw((current) => ({ ...current, [key]: value }));
  }, []);

  const clear = useCallback(() => {
    touched.current = true;
    setRaw(EMPTY_AUDIT_FILTERS);
  }, []);

  return { filters, query, isFiltering, hasValues, queryString, setFilter, clear };
}

export default useProjectAuditFilters;
