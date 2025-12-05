import type { AuditType } from "@entities/audit/model";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import type { CompleteReviewResult } from "../model/completeReview";

/**
 * Repositorio de Audits.
 */
export interface AuditRepo {
  getById(auditId: string): Promise<AuditDetail>;
  list(): Promise<AuditType>;
  /**
   * Completa la revisión de la auditoría e inicia la generación del informe final.
   */
  completeReview(auditId: string): Promise<CompleteReviewResult>;
}
