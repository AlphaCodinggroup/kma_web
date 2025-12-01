import type { AuditStatus } from "@entities/audit/model";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";

export interface CompleteReviewResponseDTO {
  audit_id: string;
  status: AuditStatus;
  message?: string | null;
  request_id: string;
}

/**
 * Mapea la respuesta del backend al modelo de dominio.
 */
export function mapCompleteReviewResponseDTOToDomain(
  dto: CompleteReviewResponseDTO
): CompleteReviewResult {
  return {
    auditId: dto.audit_id,
    status: dto.status,
    message: dto.message ?? "",
    requestId: dto.request_id,
  };
}
