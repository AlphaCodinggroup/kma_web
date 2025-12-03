"use client";

import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import type { Facility, FacilityId } from "@entities/facility/model";
import type { ApiError } from "@shared/interceptors/error";
import { archiveFacilityUseCase } from "@features/facilities/lib/usecases/archive-facility.usecase";

/**
 * Hook React Query para archivar una Facility.
 */
export function useArchiveFacilityMutation(): UseMutationResult<
  Facility,
  ApiError,
  FacilityId
> {
  const queryClient = useQueryClient();

  return useMutation<Facility, ApiError, FacilityId>({
    mutationFn: (id) => archiveFacilityUseCase(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["facilities"],
      });
    },
  });
}
