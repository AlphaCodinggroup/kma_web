import type { AuditCommentsRepo } from "@entities/audit/api/audit-comments.repo";
import type {
  AuditReviewComment,
  UpdateAuditCommentInput,
} from "@entities/audit/model/comments";
import { auditCommentsRepo } from "@features/audits/api/audit-comments.repo.impl";

type Deps = {
  repo: AuditCommentsRepo;
};

const defaultDeps: Deps = {
  repo: auditCommentsRepo,
};

export async function updateAuditComment(
  input: UpdateAuditCommentInput,
  deps?: Partial<Deps>
): Promise<AuditReviewComment> {
  const repo = deps?.repo ?? defaultDeps.repo;

  if (!input.commentId) {
    throw new Error("updateAuditComment: commentId is required");
  }
  if (!input.auditId) {
    throw new Error("updateAuditComment: auditId is required");
  }
  if (!input.stepId) {
    throw new Error("updateAuditComment: stepId is required");
  }
  if (!input.content || !input.content.trim()) {
    throw new Error("updateAuditComment: content is required");
  }

  return repo.updateComment({
    ...input,
    content: input.content.trim(),
  });
}

export default updateAuditComment;
