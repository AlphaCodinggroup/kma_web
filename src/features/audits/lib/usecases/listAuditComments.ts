import type { AuditCommentsRepo } from "@entities/audit/api/audit-comments.repo";
import type { AuditCommentsList } from "@entities/audit/model/comments";
import { auditCommentsRepo } from "@features/audits/api/audit-comments.repo.impl";

type Deps = {
  repo: AuditCommentsRepo;
};

const defaultDeps: Deps = {
  repo: auditCommentsRepo,
};

export async function listAuditComments(
  auditId: string,
  deps?: Partial<Deps>
): Promise<AuditCommentsList> {
  const repo = deps?.repo ?? defaultDeps.repo;

  if (!auditId) {
    throw new Error("listAuditComments: auditId is required");
  }

  return repo.listByAudit(auditId);
}

export default listAuditComments;
