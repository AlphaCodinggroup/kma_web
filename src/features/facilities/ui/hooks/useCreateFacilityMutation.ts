"use client";

import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";
import type {
  CreateFacilityParams,
  CreateFacilityResult,
} from "@entities/facility/model";
import type { ApiError } from "@shared/interceptors/error";
import { createFacilityUseCase } from "@features/facilities/lib/usecases/create-facility.usecase";

/**
 * Hook React Query para crear una Facility.
 */
export function useCreateFacilityMutation(): UseMutationResult<
  CreateFacilityResult,
  ApiError,
  CreateFacilityParams
> {
  const queryClient = useQueryClient();

  return useMutation<CreateFacilityResult, ApiError, CreateFacilityParams>({
    mutationFn: (params) => createFacilityUseCase(params),
    onSuccess: async () => {
      // Invalida todas las listas de facilities para refrescar el listado
      await queryClient.invalidateQueries({
        queryKey: ["facilities"],
      });
    },
  });
}
