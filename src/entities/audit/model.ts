export type IsoDateString = string;

export type AuditStatus =
  | "audit_in_progress"
  | "draft_report_pending_review"
  | "draft_report_in_review"
  | "final_report_sent_to_client"
  | "completed";

export interface Audit {
  id: string;
  flowId: string;
  flowName?: string | null;
  version: number;
  projectId: string | null;
  facilityId: string | null;
  status: AuditStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  projectName: string | null;
  auditorName: string | null;
  facilityName: string | null;
  findingsCount: number | null;
}

export type AuditType = {
  audits: Audit[];
  total: number;
  last_eval_id?: string; // Present if there are more pages available
};
