import type { AuditStatus, IsoDateString } from "@entities/audit/model";

export type AuditQuestionType =
  | "yes_no"
  | "multiple_choice"
  | "number"
  | "text";

export type ReportSeverity = "high" | "medium" | "low";

export interface AuditAttachment {
  id: string;
  name: string;
  url: string;
  mime?: string | null;
}

export interface AuditQuestion {
  id: string;
  type: AuditQuestionType;
  text: string;
  answer?: string | number | boolean | null;
  notes?: string | null;
  attachments: AuditAttachment[];
  code?: string;
  order?: number;
}

export interface AuditReportItem {
  id: string;
  title: string;
  severity: ReportSeverity;
  photos: string[];
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface AuditComment {
  id: string;
  itemId: string;
  text: string;
  page?: number | null;
  createdAt: IsoDateString;
  author: string;
}

/**
 * Detalle completo de una auditoria, con preguntas y reporte.
 */
export interface AuditDetail {
  id: string;
  flowId: string;
  flowName?: string | null;
  version: number;
  projectId: string | null;
  facilityId: string | null;
  projectName?: string | null;
  facilityName?: string | null;
  auditorName?: string | null;
  status: AuditStatus;
  auditDate: IsoDateString;
  completedDate?: IsoDateString | null;
  createdAt?: IsoDateString | null;
  updatedAt?: IsoDateString | null;
  questions: AuditQuestion[];
  reportItems: AuditReportItem[];
  comments: AuditComment[];
}
