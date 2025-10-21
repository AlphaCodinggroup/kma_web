"use client";

import React from "react";
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
 * Deriva un Flow específico desde la lista cacheada (sin refetch adicional).
 * - Útil para modales que necesitan un flow por id.
 */
export function useFlowById(flowId?: string, enabled: boolean = true) {
  const query = useFlowsQuery(enabled);

  const flow: Flow | undefined = React.useMemo(() => {
    if (!flowId) return undefined;
    return query.data?.flows.find((f) => f.id === flowId);
  }, [flowId, query.data]);

  return {
    flow,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
