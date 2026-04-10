"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  AuditAnswerUpdateResult,
  UpdateAuditAnswerInput,
} from "@entities/audit/model/audit-review-answer-update";
import type { ApiError } from "@shared/interceptors/error";
import { updateAuditAnswer } from "@features/audits/lib/usecases/updateAuditAnswer";
import { auditReviewDetailKey } from "./useAuditReviewDetail";
import { auditDetailKey } from "./useAuditDetail";

/**
 * Mutación para actualizar respuestas individuales dentro de un audit review.
 * Invalida el detalle de revisión para refrescar estatus y datos report_url.
 */
export function useUpdateAuditAnswerMutation(): UseMutationResult<
  AuditAnswerUpdateResult,
  ApiError,
  UpdateAuditAnswerInput
> {
  const queryClient = useQueryClient();

  return useMutation<
    AuditAnswerUpdateResult,
    ApiError,
    UpdateAuditAnswerInput
  >({
    mutationKey: ["audits", "review", "update-answer"],
    mutationFn: (input) => updateAuditAnswer(input),
    async onSuccess(_data, variables) {
      const auditId = variables.auditId;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: auditReviewDetailKey(auditId),
        }),
        queryClient.invalidateQueries({
          queryKey: auditDetailKey(auditId),
        })
      ]);
    },
  });
}

export default useUpdateAuditAnswerMutation;
