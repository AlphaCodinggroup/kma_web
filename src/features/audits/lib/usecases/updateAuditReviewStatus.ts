import type { AuditReviewDetailRepo } from "@entities/audit/api/audit-review.repo";
import type {
  ApplyAuditEventInput,
  AuditReviewStatusChange,
} from "@entities/audit/model/audit-review-status";
import { auditReviewDetailRepo } from "@features/audits/api/audit-review.repo.impl";

type Deps = {
  auditReviewRepo: AuditReviewDetailRepo;
};

const defaultDeps: Deps = {
  auditReviewRepo: auditReviewDetailRepo,
};

/**
 * Applies a workflow event to an audit. The resulting state comes back from the
 * backend, which owns the transition table.
 */
export async function applyAuditEvent(
  input: ApplyAuditEventInput,
  deps: Deps = defaultDeps
): Promise<AuditReviewStatusChange> {
  const { auditId, event } = input;

  if (!auditId) {
    throw new Error("applyAuditEvent: auditId is required");
  }
  if (!event) {
    throw new Error("applyAuditEvent: event is required");
  }

  return deps.auditReviewRepo.applyEvent({ auditId, event });
}

export default applyAuditEvent;
