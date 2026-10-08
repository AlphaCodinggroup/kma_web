import type { AuditStatus } from "@entities/audit/model";

const REVIEWABLE_STATUSES = new Set<AuditStatus>([
  "draft_report_pending_review", "draft_report_in_review", "final_report_sent_to_client", "completed",
]);

export function isAuditReviewAvailable(status: AuditStatus): boolean {
  return REVIEWABLE_STATUSES.has(status);
}
