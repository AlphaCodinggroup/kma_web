export interface AuditFindingPhotoInput {
  url: string;
  includeInReport?: boolean;
}

export interface UpdateAuditFindingInput {
  auditId: string;
  questionCode: string;
  quantity?: number | null;
  notes?: string | null;
  photos?: AuditFindingPhotoInput[];
}

export interface AuditFindingUpdateResult {
  auditId: string;
  questionCode: string;
  status: string;
  message: string;
}
