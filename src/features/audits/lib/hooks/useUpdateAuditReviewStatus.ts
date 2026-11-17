"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@shared/interceptors/error";
import type {
  AuditReviewStatusChange,
  UpdateAuditReviewStatusInput,
} from "@entities/audit/model/audit-review-status";
import { updateAuditReviewStatus } from "@features/audits/lib/usecases/updateAuditReviewStatus";
import { auditReviewDetailKey } from "./useAuditReviewDetail";
import { auditDetailKey } from "./useAuditDetail";

export function useUpdateAuditReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    AuditReviewStatusChange,
    ApiError,
    UpdateAuditReviewStatusInput
  >({
    mutationKey: ["audits", "review", "update-status"],
    mutationFn: (input) => updateAuditReviewStatus(input),
    async onSuccess(_data, variables) {
      const { auditId } = variables;

      if (variables.status === "draft_report_in_review") {
        const queryKey = ["reports", "by-audit", auditId];
        await queryClient.cancelQueries({ queryKey });
        queryClient.removeQueries({ queryKey });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: auditReviewDetailKey(auditId) }),
        queryClient.invalidateQueries({ queryKey: auditDetailKey(auditId) }),
        queryClient.invalidateQueries({ queryKey: ["audits", "list"] }),
      ]);
    },
  });
}

export default useUpdateAuditReviewStatus;
