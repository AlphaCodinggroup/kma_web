import type { AuditRepo } from "@entities/audit/api/audit.repo";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import auditRepoImpl from "@features/audits/api/audit.repo.impl";

type Deps = {
  repo: AuditRepo;
};

/**
 * Caso de uso: obtener detalle de auditoría por id.
 */
export async function getAuditById(
  auditId: string,
  deps?: Partial<Deps>
): Promise<AuditDetail> {
  // Un id vacío llegaba al repositorio y terminaba pegándole al endpoint de
  // colección en vez de al del recurso.
  if (!auditId?.trim()) {
    throw new Error("getAuditById: auditId is required");
  }

  const repo = deps?.repo ?? auditRepoImpl;
  return repo.getById(auditId);
}

export default getAuditById;
