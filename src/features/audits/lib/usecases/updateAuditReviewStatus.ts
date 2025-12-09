import type { AuditReviewDetailRepo } from "@entities/audit/api/audit-review.repo";
import type {
  AuditReviewStatusChange,
  UpdateAuditReviewStatusInput,
} from "@entities/audit/model/audit-review-status";
import { auditReviewDetailRepo } from "@features/audits/api/audit-review.repo.impl";

type Deps = {
  auditReviewRepo: AuditReviewDetailRepo;
};

const defaultDeps: Deps = {
  auditReviewRepo: auditReviewDetailRepo,
};

export async function updateAuditReviewStatus(
  input: UpdateAuditReviewStatusInput,
  deps: Deps = defaultDeps
): Promise<AuditReviewStatusChange> {
  const { auditId, status } = input;

  if (!auditId) {
    throw new Error("updateAuditReviewStatus: auditId is required");
  }
  if (!status) {
    throw new Error("updateAuditReviewStatus: status is required");
  }

  return deps.auditReviewRepo.updateStatus({ auditId, status });
}

export default updateAuditReviewStatus;
