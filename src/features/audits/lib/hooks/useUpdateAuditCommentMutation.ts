"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  AuditReviewComment,
  UpdateAuditCommentInput,
} from "@entities/audit/model/comments";
import type { ApiError } from "@shared/interceptors/error";
import { updateAuditComment } from "@features/audits/lib/usecases/updateAuditComment";
import { auditCommentsKey } from "./useAuditComments";

/**
 * Hook React Query para editar un comentario existente.
 * Invalida solo la lista de comentarios asociada.
 */
export function useUpdateAuditCommentMutation(): UseMutationResult<
  AuditReviewComment,
  ApiError,
  UpdateAuditCommentInput
> {
  const queryClient = useQueryClient();

  return useMutation<AuditReviewComment, ApiError, UpdateAuditCommentInput>({
    mutationKey: ["audits", "comments", "update"],
    mutationFn: (input) => updateAuditComment(input),
    async onSuccess(_data, variables) {
      const { auditId } = variables;
      await queryClient.invalidateQueries({
        queryKey: auditCommentsKey(auditId),
      });
    },
  });
}
