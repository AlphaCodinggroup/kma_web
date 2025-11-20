export type IsoDateString = string;

export type AuditStatus =
  | "draft" //
  | "pending_review"
  | "in_review" //
  | "review_modified"
  | "Generating Report"
  | "generating_report_draft"
  | "generating_report_final"
  | "completed";

export type AnswerValue = {
  notes?: string;
  measurements?: number;
  quantity?: number;
  photos?: string[];
  [k: string]: unknown;
};

export type AnswerType = "Question" | "Form" | "Select";

export interface BaseAnswer {
  stepId: string;
  type: AnswerType;
}

export interface QuestionAnswer extends BaseAnswer {
  type: "Question";
  answer?: string;
  values?: AnswerValue;
}

export interface FormAnswer extends BaseAnswer {
  type: "Form";
  values?: AnswerValue;
}

export interface SelectAnswer extends BaseAnswer {
  type: "Select";
  answer?: string;
}

export type AuditAnswer = QuestionAnswer | FormAnswer | SelectAnswer;

export interface Audit {
  id: string;
  flowId: string;
  version: number;
  projectId: string | null;
  projectName: string | null;
  facilityId: string | null;
  status: AuditStatus;
  answers: AuditAnswer[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  auditorName: string | null;
}

export type AuditType = {
  audits: Audit[];
  total: number;
};
