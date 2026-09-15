export interface AnswerItemUpdate {
  step_id: string;
  type?: string;
  answer?: string;
  values?: Record<string, unknown>;
}

export interface UpdateAuditAnswerInput {
  auditId: string;
  answers: AnswerItemUpdate[];
}

export interface AuditAnswerUpdateResult {
  audit_id: string;
  status: string;
  message: string;
}
