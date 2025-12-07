"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  AuditReviewComment,
  CreateAuditCommentInput,
} from "@entities/audit/model/comments";
import type { ApiError } from "@shared/interceptors/error";
import { createAuditComment } from "@features/audits/lib/usecases/createAuditComment";
import { auditReviewDetailKey } from "./useAuditReviewDetail";
import { auditDetailKey } from "./useAuditDetail";

/**
 * Hook React Query para crear un comentario en una auditoría en revisión.
 * Invalida el detalle de auditoría y el detalle de revisión para refrescar la UI.
 */
export function useCreateAuditCommentMutation(): UseMutationResult<
  AuditReviewComment,
  ApiError,
  CreateAuditCommentInput
> {
  const queryClient = useQueryClient();

  return useMutation<AuditReviewComment, ApiError, CreateAuditCommentInput>({
    mutationKey: ["audits", "comments", "create"],
    mutationFn: (input) => createAuditComment(input),
    async onSuccess(_data, variables) {
      const { auditId } = variables;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: auditReviewDetailKey(auditId),
        }),
        queryClient.invalidateQueries({
          queryKey: auditDetailKey(auditId),
        }),
      ]);
    },
  });
}
