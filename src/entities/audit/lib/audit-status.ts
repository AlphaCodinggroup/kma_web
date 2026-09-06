import type { AuditStatus } from "@entities/audit/model";

/**
 * The audit workflow vocabulary, mirroring lambdas/shared/statemachine.
 *
 * This is the only list in the browser. It used to be repeated in four mappers
 * and two label tables, so a backend rename left blank badges and empty menus
 * instead of an error.
 */
export const AUDIT_STATUSES: readonly AuditStatus[] = [
  "audit_in_progress",
  "draft_report_pending_review",
  "draft_report_in_review",
  "final_report_sent_to_client",
  "completed",
] as const;

/** Human readable label for every state. */
export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  audit_in_progress: "Audit In Progress",
  draft_report_pending_review: "Draft Report Pending Review",
  draft_report_in_review: "Draft Report In Review",
  final_report_sent_to_client: "Approved for Export",
  completed: "Completed",
};

/** Reports whether the value is a state this build knows. */
export function isAuditStatus(raw: unknown): raw is AuditStatus {
  return typeof raw === "string" && AUDIT_STATUSES.includes(raw as AuditStatus);
}

/**
 * Narrows a backend value to AuditStatus.
 *
 * An unrecognised value falls back rather than being cast through, because a
 * cast produced a value the label and action tables could not resolve, which
 * surfaced as an empty badge instead of a visible failure.
 */
export function toAuditStatus(
  raw: unknown,
  fallback: AuditStatus = "draft_report_pending_review"
): AuditStatus {
  if (isAuditStatus(raw)) return raw;
  if (raw !== undefined && raw !== null && raw !== "") {
    console.warn("[audit] unknown audit status from the backend:", raw);
  }
  return fallback;
}

/** Label for a state, falling back to the raw value so nothing renders blank. */
export function auditStatusLabel(raw: unknown): string {
  return isAuditStatus(raw) ? AUDIT_STATUS_LABELS[raw] : String(raw ?? "");
}
