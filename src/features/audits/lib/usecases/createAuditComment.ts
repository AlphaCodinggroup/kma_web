import type { AuditCommentsRepo } from "@entities/audit/api/audit-comments.repo";
import type {
  AuditReviewComment,
  CreateAuditCommentInput,
} from "@entities/audit/model/comments";
import { auditCommentsRepo } from "@features/audits/api/audit-comments.repo.impl";

type Deps = {
  repo: AuditCommentsRepo;
};

const defaultDeps: Deps = {
  repo: auditCommentsRepo,
};

export async function createAuditComment(
  input: CreateAuditCommentInput,
  deps?: Partial<Deps>
): Promise<AuditReviewComment> {
  const repo = deps?.repo ?? defaultDeps.repo;

  if (!input.auditId) {
    throw new Error("createAuditComment: auditId is required");
  }
  if (!input.stepId) {
    throw new Error("createAuditComment: stepId is required");
  }
  if (!input.content || !input.content.trim()) {
    throw new Error("createAuditComment: content is required");
  }

  return repo.createComment({
    ...input,
    content: input.content.trim(),
  });
}

export default createAuditComment;
