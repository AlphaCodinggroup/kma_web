import type { AuditStatus } from "@entities/audit/model";

export interface AuditReport {
  id: string;
  flowId: string | null;
  userId: string | null;
  status: AuditStatus;
  reportName: string | null;
  reportUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  completedAt: string | null;
  reportProgress?: ReportProgress | null | undefined;
}

export interface ReportProgress {
  requestId: string | null;
  step: string | null;
  photosDone: number | null;
  photosTotal: number | null;
  percent: number | null;
  updatedAt: string | null;
}
