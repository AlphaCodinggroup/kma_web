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
import { auditCommentsKey } from "./useAuditComments";

/**
 * Hook React Query para crear un comentario en una auditoría en revisión.
 * Invalida solo la lista de comentarios (evitamos refrescar otros detalles).
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
      await queryClient.invalidateQueries({
        queryKey: auditCommentsKey(auditId),
      });
    },
  });
}
