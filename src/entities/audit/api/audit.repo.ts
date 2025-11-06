import type { AuditType } from "@entities/audit/model";

/**
 * Repositorio de Audits.
 */
export interface AuditRepo {
  list(): Promise<AuditType>;
}
