import type {
  AuditCommentsRepo,
  ListAuditCommentsParams,
} from "@entities/audit/api/audit-comments.repo";
import type { AuditCommentsResult } from "@entities/audit/model/audit-comment";
import { auditCommentsRepoImpl } from "@features/audits/api/audit-comments.repo.impl";

type Deps = {
  repo: AuditCommentsRepo;
};

/**
 * Caso de uso: listar comentarios de una auditoría (opcionalmente filtrados por stepId).
 */
export async function listAuditComments(
  params: ListAuditCommentsParams,
  deps?: Partial<Deps>
): Promise<AuditCommentsResult> {
  if (!params.auditId) {
    throw new Error("listAuditComments: auditId is required");
  }

  const repo = deps?.repo ?? auditCommentsRepoImpl;

  return repo.list(params);
}

export default listAuditComments;
