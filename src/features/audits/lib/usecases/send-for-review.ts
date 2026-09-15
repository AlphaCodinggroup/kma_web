import type { AuditReviewRepo } from "@entities/audit/api/sendReview.repo";
import type { SendForReviewResult } from "@entities/audit/model/sendReview";
import { auditReviewRepo } from "@features/audits/api/sendReview.repo.impl";

export type SendForReview = (auditId: string) => Promise<SendForReviewResult>;

export function makeSendForReviewUsecase(deps: {
  repo: AuditReviewRepo;
}): SendForReview {
  const { repo } = deps;

  return async (auditId: string): Promise<SendForReviewResult> => {
    // Un id vacío llegaba al repositorio y terminaba pegándole al endpoint de
    // colección en vez de al del recurso.
    if (!auditId?.trim()) {
      throw new Error("sendForReview: auditId is required");
    }

    const result = await repo.sendForReview(auditId);
    return result;
  };
}

/**
 * Implementación por defecto, usando la repo impl registrada en features.
 */
export const sendForReview: SendForReview = makeSendForReviewUsecase({
  repo: auditReviewRepo,
});
