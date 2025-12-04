import type { ReportStatus } from "./audit-report";

/**
 * Item de listado de reports en dominio.
 */
export interface ReportListItem {
  id: string;
  flowId: string;
  userId: string | null;
  projectId: string | null;
  status: ReportStatus;
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
  status?: ReportStatus;
  limit?: number;
  lastEvalId?: string;
}
