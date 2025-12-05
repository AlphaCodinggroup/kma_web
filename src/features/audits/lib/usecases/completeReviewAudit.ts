import type { AuditRepo } from "@entities/audit/api/audit.repo";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";
import auditRepoImpl from "@features/audits/api/audit.repo.impl";

export interface CompleteReviewAuditDeps {
  auditRepo: AuditRepo;
}

const defaultDeps: CompleteReviewAuditDeps = {
  auditRepo: auditRepoImpl,
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

  return deps.auditRepo.completeReview(auditId);
}
