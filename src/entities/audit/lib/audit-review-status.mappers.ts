import type { AuditStatus } from "@entities/audit/model";
import type {
  ApplyAuditEventInput,
  AuditEvent,
  AuditReviewStatusChange,
} from "@entities/audit/model/audit-review-status";

export type ApplyAuditEventDTO = {
  event: AuditEvent;
};

export type AuditReviewStatusChangeDTO = {
  audit_id: string;
  event: AuditEvent;
  old_status: AuditStatus;
  new_status: AuditStatus;
  message: string;
};

export const mapApplyAuditEventInputToDTO = (
  input: ApplyAuditEventInput
): ApplyAuditEventDTO => ({ event: input.event });

export const mapAuditReviewStatusChangeDTOToDomain = (
  dto: AuditReviewStatusChangeDTO
): AuditReviewStatusChange => ({
  auditId: dto.audit_id,
  event: dto.event,
  oldStatus: dto.old_status,
  newStatus: dto.new_status,
  message: dto.message,
});
