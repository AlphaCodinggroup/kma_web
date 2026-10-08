"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import listAudits from "../usecases/listAudits";
import type { UseListAuditsOptions } from "./useListAudits";

/** Acumula páginas reales; los filtros forman parte de la identidad de la consulta. */
export function useInfiniteAudits(opts: UseListAuditsOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["audits", "list", "infinite", opts.status, opts.auditor, opts.projectId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listAudits({
      params: {
        limit: 100,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.auditor ? { auditor: opts.auditor } : {}),
        ...(opts.projectId ? { project_id: opts.projectId } : {}),
        ...(pageParam ? { last_eval_id: pageParam } : {}),
      },
    }),
    getNextPageParam: page => page.last_eval_id || undefined,
    enabled: opts.enabled ?? true,
    staleTime: opts.staleTime ?? 60_000,
    gcTime: opts.gcTime ?? 5 * 60_000,
    // Al cambiar un filtro se conservan las filas anteriores. Sin reintentos automáticos: un error de cursor
    // detiene la carga y se reanuda con el reintento explícito de la página.
    placeholderData: keepPreviousData,
    retry: false,
  });
}
