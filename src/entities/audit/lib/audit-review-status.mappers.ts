import type { AuditStatus } from "@entities/audit/model";
import type {
  AuditReviewStatusChange,
  UpdateAuditReviewStatusInput,
} from "@entities/audit/model/audit-review-status";

export type UpdateAuditReviewStatusDTO = {
  status: AuditStatus;
};

export type AuditReviewStatusChangeDTO = {
  audit_id: string;
  old_status: AuditStatus;
  new_status: AuditStatus;
  message: string;
};

export const mapUpdateAuditReviewStatusInputToDTO = (
  input: UpdateAuditReviewStatusInput
): UpdateAuditReviewStatusDTO => {
  return { status: input.status };
};

export const mapAuditReviewStatusChangeDTOToDomain = (
  dto: AuditReviewStatusChangeDTO
): AuditReviewStatusChange => ({
  auditId: dto.audit_id,
  oldStatus: dto.old_status,
  newStatus: dto.new_status,
  message: dto.message,
});
