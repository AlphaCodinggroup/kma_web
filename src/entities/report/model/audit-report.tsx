import type { AuditStatus } from "@entities/audit/model";

export interface AuditReport {
  id: string;
  flowId: string;
  userId: string | null;
  status: AuditStatus;
  reportUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
