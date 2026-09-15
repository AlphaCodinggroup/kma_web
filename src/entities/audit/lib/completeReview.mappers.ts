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
    // Un request_id vacío no permite seguir la generación del reporte: se
    // corta acá en vez de propagarlo y dejar al poller consultando "".
    requestId: requireRequestId(dto.request_id),
  };
}

/** requireRequestId valida el identificador con el que se sigue el reporte. */
function requireRequestId(raw: unknown): string {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed === "") {
    throw new Error("mapCompleteReviewDTO: request_id is required");
  }
  return trimmed;
}
