import { toAuditStatus } from "@entities/audit/lib/audit-status";
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
  // Los estados se normalizan contra la lista de estados conocidos: el mapper
  // confiaba en el tipado y un valor inesperado del backend entraba al dominio
  // sin señalizarse.
  oldStatus: toAuditStatus(dto.old_status),
  newStatus: toAuditStatus(dto.new_status),
  message: dto.message,
});
