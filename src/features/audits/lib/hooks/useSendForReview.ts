import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { sendForReview } from "@features/audits/lib/usecases/send-for-review";
import type { SendForReviewResult } from "@entities/audit/model/sendReview";
import type { ApiError } from "@shared/interceptors/error";

/**
 * Hook de mutación
 */
export function useSendForReviewMutation(
  options?: UseMutationOptions<
    SendForReviewResult,
    ApiError,
    { auditId: string }
  >
) {
  return useMutation<SendForReviewResult, ApiError, { auditId: string }>({
    mutationKey: ["audits", "send-for-review"] as QueryKey,
    mutationFn: ({ auditId }) => sendForReview(auditId),
    ...options,
  });
}
