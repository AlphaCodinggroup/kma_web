"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@shared/interceptors/error";
import type {
  ApplyAuditEventInput,
  AuditReviewStatusChange,
} from "@entities/audit/model/audit-review-status";
import { applyAuditEvent } from "@features/audits/lib/usecases/updateAuditReviewStatus";
import { auditReviewDetailKey } from "./useAuditReviewDetail";
import { auditDetailKey } from "./useAuditDetail";

/** Applies a workflow event and refreshes everything that shows the state. */
export function useApplyAuditEvent() {
  const queryClient = useQueryClient();

  return useMutation<AuditReviewStatusChange, ApiError, ApplyAuditEventInput>({
    mutationKey: ["audits", "review", "apply-event"],
    mutationFn: (input) => applyAuditEvent(input),
    async onSuccess(_data, variables) {
      const { auditId } = variables;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: auditReviewDetailKey(auditId) }),
        queryClient.invalidateQueries({ queryKey: auditDetailKey(auditId) }),
        queryClient.invalidateQueries({ queryKey: ["audits", "list"] }),
      ]);
    },
  });
}

export default useApplyAuditEvent;
