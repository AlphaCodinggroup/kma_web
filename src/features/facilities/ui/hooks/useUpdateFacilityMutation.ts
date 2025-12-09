"use client";

import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import type { UpdateFacilityResult } from "@entities/facility/model";
import type { ApiError } from "@shared/interceptors/error";
import {
  updateFacilityUseCase,
  type UpdateFacilityInput,
} from "@features/facilities/lib/usecases/update-facility.usecase";

/**
 * Hook React Query para actualizar una Facility.
 */
export function useUpdateFacilityMutation(): UseMutationResult<
  UpdateFacilityResult,
  ApiError,
  UpdateFacilityInput
> {
  const queryClient = useQueryClient();

  return useMutation<UpdateFacilityResult, ApiError, UpdateFacilityInput>({
    mutationFn: (params) => updateFacilityUseCase(params),
    onSuccess: async (updated) => {
      // Refrescar listados de facilities
      await queryClient.invalidateQueries({
        queryKey: ["facilities"],
      });

      // Si en algún momento tenés query de detalle para facility específica,
      // esto dejaría la puerta abierta para refrescarla también:
      await queryClient.invalidateQueries({
        queryKey: ["facility", updated.id],
      });
    },
  });
}
