export type IsoDateString = string;

export type AuditStatus =
  | "draft_report_pending_review"
  | "draft_report_in_review"
  | "final_report_sent_to_client"
  | "completed";

export interface Audit {
  id: string;
  flowId: string;
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
}

export type AuditType = {
  audits: Audit[];
  total: number;
};
