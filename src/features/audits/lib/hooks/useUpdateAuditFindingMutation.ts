"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  AuditFindingUpdateResult,
  UpdateAuditFindingInput,
} from "@entities/audit/model/audit-review-finding-update";
import type { ApiError } from "@shared/interceptors/error";
import { updateAuditFinding } from "@features/audits/lib/usecases/updateAuditFinding";
import { auditReviewDetailKey } from "./useAuditReviewDetail";

/**
 * Mutación para actualizar un hallazgo individual dentro de un audit review.
 * Invalida el detalle de revisión para refrescar costos y datos calculados.
 */
export function useUpdateAuditFindingMutation(): UseMutationResult<
  AuditFindingUpdateResult,
  ApiError,
  UpdateAuditFindingInput
> {
  const queryClient = useQueryClient();

  return useMutation<
    AuditFindingUpdateResult,
    ApiError,
    UpdateAuditFindingInput
  >({
    mutationKey: ["audits", "review", "update-finding"],
    mutationFn: (input) => updateAuditFinding(input),
    async onSuccess(_data, variables) {
      const auditId = variables.auditId;
      await queryClient.invalidateQueries({
        queryKey: auditReviewDetailKey(auditId),
      });
    },
  });
}

export default useUpdateAuditFindingMutation;
