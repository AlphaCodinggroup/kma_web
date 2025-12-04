import type { AuditStatus } from "@entities/audit/model";

/**
 * Item de listado de reports en dominio.
 */
export interface ReportListItem {
  id: string;
  flowId: string;
  userId: string | null;
  projectId: string | null;
  status: AuditStatus;
  reportUrl: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

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
  projectId?: string;
  userId?: string;
  status?: AuditStatus;
  limit?: number;
  lastEvalId?: string;
}
