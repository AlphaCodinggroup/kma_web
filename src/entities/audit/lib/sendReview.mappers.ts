import type { AuditStatus } from "@entities/audit/model";
import type {
  ReviewProgress,
  SendForReviewResult,
} from "@entities/audit/model/sendReview";

export type SendForReviewDTO = {
  audit_id: string;
  audit_review_id: string;
  status: string;
  message?: string;
  review_ready?: boolean;
};

/** Normaliza una cadena a AuditStatus manteniendo valores “desconocidos” sin romper el tipado. */
const toAuditStatus = (raw: string): AuditStatus => {
  const allowed: AuditStatus[] = [
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ];

  if (allowed.includes(raw as AuditStatus)) {
    return raw as AuditStatus;
  }
  return raw as AuditStatus;
};

/** Mapea DTO → Dominio para el resultado inmediato de “Enviar para Revisión”. */
export const mapSendForReviewDTO = (
  dto: SendForReviewDTO
): SendForReviewResult => {
  return {
    auditId: dto.audit_id,
    auditReviewId: dto.audit_review_id,
    status: toAuditStatus(dto.status),
    message: dto.message ?? "",
    reviewReady: Boolean(dto.review_ready),
  };
};

/** Alias semántico: si el polling devuelve el mismo shape, reutilizamos el mapeo. */
export const mapReviewProgressDTO = (dto: SendForReviewDTO): ReviewProgress => {
  return mapSendForReviewDTO(dto);
};
