"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";
import { completeReviewAudit } from "@features/audits/lib/usecases/completeReviewAudit";

type Variables = { auditId: string };

export function useCompleteReviewAuditMutation() {
  const queryClient = useQueryClient();

  return useMutation<CompleteReviewResult, Error, Variables>({
    mutationKey: ["audits", "complete-review"],
    mutationFn: ({ auditId }) => completeReviewAudit(auditId),
    onSuccess: (_data, _vars) => {
      // Invalidar lista y detalles de auditorías
      queryClient.invalidateQueries({ queryKey: ["audits", "list"] });
      queryClient.invalidateQueries({ queryKey: ["audits", "detail"] });
    },
  });
}
