"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  CreateFlowCategoryInput,
  FlowCategory,
  FlowCategoryId,
  FlowCategoryList,
  UpdateFlowCategoryInput,
} from "@entities/flow/model";
import { flowCategoriesRepo } from "@features/flows/api/flow-categories.repo.impl";
import { FlowsApiError } from "@features/flows/api/flows.repo.impl";
import { PublicEnv } from "@shared/config/env";

export const flowCategoriesKeys = {
  all: ["flow-categories"] as const,
  list: (active?: boolean) =>
    ["flow-categories", "list", active === undefined ? "all" : String(active)] as const satisfies QueryKey,
} as const;

export function useFlowCategoriesQuery(
  enabled: boolean,
  options?: { active?: boolean | undefined }
) {
  return useQuery<FlowCategoryList, FlowsApiError>({
    queryKey: flowCategoriesKeys.list(options?.active),
    queryFn: () => flowCategoriesRepo.list(options),
    staleTime: PublicEnv.queryStaleTimeMs,
    enabled,
    placeholderData: keepPreviousData,
    retry(failureCount, error) {
      if (error instanceof FlowsApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateFlowCategory() {
  const queryClient = useQueryClient();
  return useMutation<FlowCategory, FlowsApiError, CreateFlowCategoryInput>({
    mutationFn: (input) => flowCategoriesRepo.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowCategoriesKeys.all });
    },
  });
}

export function useUpdateFlowCategory() {
  const queryClient = useQueryClient();
  return useMutation<
    FlowCategory,
    FlowsApiError,
    { id: FlowCategoryId; input: UpdateFlowCategoryInput }
  >({
    mutationFn: ({ id, input }) => flowCategoriesRepo.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowCategoriesKeys.all });
    },
  });
}

export function useDeleteFlowCategory() {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    FlowsApiError,
    { id: FlowCategoryId; permanent?: boolean | undefined }
  >({
    mutationFn: ({ id, permanent }) => flowCategoriesRepo.delete(id, { permanent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowCategoriesKeys.all });
    },
  });
}
