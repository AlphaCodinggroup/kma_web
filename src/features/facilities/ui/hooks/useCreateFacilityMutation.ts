"use client";

import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";
import type { CreateFacilityResult } from "@entities/facility/model";
import type { ApiError } from "@shared/interceptors/error";
import {
  createFacilityUseCase,
  type CreateFacilityInput,
} from "@features/facilities/lib/usecases/create-facility.usecase";

/**
 * Hook React Query para crear una Facility.
 */
export function useCreateFacilityMutation(): UseMutationResult<
  CreateFacilityResult,
  ApiError,
  CreateFacilityInput
> {
  const queryClient = useQueryClient();

  return useMutation<CreateFacilityResult, ApiError, CreateFacilityInput>({
    mutationFn: (params) => createFacilityUseCase(params),
    onSuccess: async () => {
      // Invalida todas las listas de facilities para refrescar el listado
      await queryClient.invalidateQueries({
        queryKey: ["facilities"],
      });
    },
  });
}
