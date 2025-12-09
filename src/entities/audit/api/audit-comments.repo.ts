import type {
  AuditCommentsList,
  AuditReviewComment,
  CreateAuditCommentInput,
  UpdateAuditCommentInput,
} from "@entities/audit/model/comments";

export interface AuditCommentsRepo {
  createComment(input: CreateAuditCommentInput): Promise<AuditReviewComment>;
  updateComment(input: UpdateAuditCommentInput): Promise<AuditReviewComment>;
  listByAudit(auditId: string): Promise<AuditCommentsList>;
}
