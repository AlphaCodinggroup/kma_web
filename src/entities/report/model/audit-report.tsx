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
}
