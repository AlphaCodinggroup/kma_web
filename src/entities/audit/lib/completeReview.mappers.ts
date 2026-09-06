import type { AuditStatus } from "@entities/audit/model";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";

export interface CompleteReviewResponseDTO {
  audit_id: string;
  status: AuditStatus;
  message?: string | null;
  request_id: string;
	job_id?: string | null;
	job_status?: CompleteReviewResult["jobStatus"] | null;
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
	jobId: dto.job_id ?? dto.request_id,
	jobStatus: dto.job_status ?? "queued",
  };
}
