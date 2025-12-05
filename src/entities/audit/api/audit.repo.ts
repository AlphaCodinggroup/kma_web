import type { AuditType } from "@entities/audit/model";
import type { CompleteReviewResult } from "../model/completeReview";

/**
 * Repositorio de Audits.
 */
export interface AuditRepo {
  list(): Promise<AuditType>;
  /**
   * Completa la revisión de la auditoría e inicia la generación del informe final.
   */
  completeReview(auditId: string): Promise<CompleteReviewResult>;
}
