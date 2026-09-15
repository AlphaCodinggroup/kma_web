import type { AuditType } from "@entities/audit/model";
import type { AuditDetail } from "@entities/audit/model/audit-detail";

/**
 * Query parameters for listing audits.
 */
export interface AuditListParams {
  status?: string;
  auditor?: string;
  limit?: number;
  last_eval_id?: string;
}

/**
 * Repositorio de Audits.
 */
export interface AuditRepo {
  getById(auditId: string): Promise<AuditDetail>;
  list(params?: AuditListParams): Promise<AuditType>;
  delete(auditId: string): Promise<void>;
}
