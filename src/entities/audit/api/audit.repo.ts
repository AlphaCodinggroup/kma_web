import type { AuditType } from "@entities/audit/model";
import type { AuditDetail } from "@entities/audit/model/audit-detail";

/**
 * Repositorio de Audits.
 */
export interface AuditRepo {
  getById(auditId: string): Promise<AuditDetail>;
  list(): Promise<AuditType>;
}
