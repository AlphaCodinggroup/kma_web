import type { AuditReport } from "@entities/report/model/audit-report";
import type { AuditStatus } from "@entities/audit/model";

/**
 * Item de listado de reports en dominio.
 */
export type ReportListItem = AuditReport;

/**
 * Resultado paginado del endpoint GET /api/reports en dominio.
 */
export interface ReportListPage {
  items: ReportListItem[];
  count: number;
  lastEvalId: string | null;
  hasMore: boolean;
}

/**
 * Filtros de búsqueda en dominio para listar reports.
 */
export interface ReportListFilter {
  userId?: string;
  status?: AuditStatus;
  limit?: number;
  lastEvalId?: string;
}
