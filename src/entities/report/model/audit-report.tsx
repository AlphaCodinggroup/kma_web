export type ReportStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed"
  | (string & {});

export interface AuditReport {
  id: string;
  flowId: string;
  userId: string | null;
  status: ReportStatus;
  reportUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
