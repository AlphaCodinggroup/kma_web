import type { AuditId } from "@entities/audit/model";
import type { AuditCommentsResult } from "@entities/audit/model/audit-comment";

/**
 * Parámetros para listar comentarios de una auditoría.
 */
export type ListAuditCommentsParams = {
  auditId: AuditId;
  stepId?: string;
};

/**
 * Contrato de repositorio para comentarios de auditoría.
 */
export interface AuditCommentsRepo {
  list(params: ListAuditCommentsParams): Promise<AuditCommentsResult>;
}
