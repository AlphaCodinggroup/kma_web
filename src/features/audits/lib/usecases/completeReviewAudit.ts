import type { AuditReviewDetailRepo } from "@entities/audit/api/audit-review.repo";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";
import { auditReviewDetailRepo } from "@features/audits/api/audit-review.repo.impl";

export interface CompleteReviewAuditDeps {
  auditReviewRepo: AuditReviewDetailRepo;
}

const defaultDeps: CompleteReviewAuditDeps = {
  auditReviewRepo: auditReviewDetailRepo,
};

/**
 * Usecase: completar la revisión de una auditoría e iniciar
 * la generación del informe final.
 */
export async function completeReviewAudit(
  auditId: string,
  deps: CompleteReviewAuditDeps = defaultDeps
): Promise<CompleteReviewResult> {
  if (!auditId) {
    throw new Error("completeReviewAudit: auditId is required");
  }

  return deps.auditReviewRepo.completeReview(auditId);
}
