"use client";

import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import type { FacilityId } from "@entities/facility/model";
import type { ApiError } from "@shared/interceptors/error";
import { deleteFacilityUseCase } from "@features/facilities/lib/usecases/delete-facility.usecase";

/**
 * Hook React Query para eliminar una Facility.
 */
export function useDeleteFacilityMutation(): UseMutationResult<
  void,
  ApiError,
  FacilityId
> {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, FacilityId>({
    mutationFn: (id) => deleteFacilityUseCase(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["facilities"],
      });
    },
  });
}
