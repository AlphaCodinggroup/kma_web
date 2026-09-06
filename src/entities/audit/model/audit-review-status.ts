import type { AuditStatus } from "@entities/audit/model";

/** The workflow events the backend state machine accepts. */
export const AUDIT_EVENTS = [
  "submit_audit",
  "send_for_review",
  "open_review",
  "complete_review",
  "reject_review",
  "reopen_review",
] as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[number];

export interface AuditReviewStatusChange {
  auditId: string;
  event: AuditEvent;
  oldStatus: AuditStatus;
  newStatus: AuditStatus;
  message: string;
}

/**
 * A workflow command names the event to apply, not the state to land on: the
 * backend resolves the resulting state from its own transition table, so the
 * browser no longer carries a second copy of the workflow rules.
 */
export interface ApplyAuditEventInput {
  auditId: string;
  event: AuditEvent;
}
