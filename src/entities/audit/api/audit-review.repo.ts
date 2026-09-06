import type {
  AuditReviewDetail,
} from "@entities/audit/model/audit-review";
import type {
  AuditFindingUpdateResult,
  UpdateAuditFindingInput,
} from "@entities/audit/model/audit-review-finding-update";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";
import type {
  ApplyAuditEventInput,
  AuditReviewStatusChange,
} from "@entities/audit/model/audit-review-status";

export interface AuditReviewDetailRepo {
  getReviewDetail(auditId: string): Promise<AuditReviewDetail>;
  completeReview(auditId: string): Promise<CompleteReviewResult>;
  openReview(auditId: string): Promise<AuditReviewDetail>;
  applyEvent(input: ApplyAuditEventInput): Promise<AuditReviewStatusChange>;
  updateFinding(
    input: UpdateAuditFindingInput
  ): Promise<AuditFindingUpdateResult>;
}
