"use client";

import {
  useQuery,
  keepPreviousData,
  type QueryKey,
} from "@tanstack/react-query";
import type { FlowList, Flow } from "@entities/flow/model";
import { flowsRepo, FlowsApiError } from "@features/flows/api/flows.repo.impl";
import { PublicEnv } from "@shared/config/env";

/** Claves de cache estables */
export const flowsKeys = {
  all: ["flows"] as const,
  list: () => ["flows", "list"] as const satisfies QueryKey,
  detail: (id: string) => ["flows", "detail", id] as const satisfies QueryKey,
} as const;

/**
 * Lista de flows (cacheada).
 * - `staleTime` desde env público.
 * - `retry` corta en 401.
 * - `placeholderData` mantiene datos previos en re-fetch.
 */
export function useFlowsQuery(enabled: boolean) {
  return useQuery<FlowList, FlowsApiError>({
    queryKey: flowsKeys.list(),
    queryFn: () => flowsRepo.list(),
    staleTime: PublicEnv.queryStaleTimeMs,
    enabled,
    placeholderData: keepPreviousData,
    retry(failureCount, error) {
      if (error instanceof FlowsApiError && error.status === 401) return false;
      // Total: 1 (intento) + 2 (reintentos) = 3
      return failureCount < 2;
    },
  });
}

/**
 * Obtiene un Flow específico desde el backend.
 * - Usa el endpoint GET /api/flows/:id
 */
export function useFlowById(flowId?: string, enabled: boolean = true) {
  const query = useQuery<Flow | null, FlowsApiError>({
    queryKey: flowId ? flowsKeys.detail(flowId) : ["flows", "detail", "unknown"],
    queryFn: () => (flowId ? flowsRepo.getById(flowId) : Promise.resolve(null)),
    staleTime: PublicEnv.queryStaleTimeMs,
    enabled: !!flowId && enabled,
    retry(failureCount, error) {
      if (error instanceof FlowsApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });

  return {
    flow: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
