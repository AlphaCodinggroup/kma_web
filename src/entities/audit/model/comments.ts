import type { IsoDateString } from "@entities/audit/model";

export interface CreateAuditCommentInput {
  auditId: string;
  stepId: string;
  content: string;
}

export interface UpdateAuditCommentInput extends CreateAuditCommentInput {
  commentId: string;
}

export interface AuditReviewComment {
  id: string;
  auditId: string;
  stepId: string;
  userId: string;
  content: string;
  version: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
