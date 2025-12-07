import type {
  AuditReviewComment,
  CreateAuditCommentInput,
} from "@entities/audit/model/comments";

export interface AuditCommentsRepo {
  createComment(input: CreateAuditCommentInput): Promise<AuditReviewComment>;
}
