import type { AuditType } from "@entities/audit/model";
import type { AuditRepo, AuditListParams } from "@entities/audit/api/audit.repo";
import auditRepoImpl from "@features/audits/api/audit.repo.impl";

type Deps = {
  repo: AuditRepo;
  params?: AuditListParams;
};

/**
 * listAudits
 * Caso de uso que abstrae el origen de datos (repo) y retorna Audits de dominio.
 */
export async function listAudits(deps?: Partial<Deps>): Promise<AuditType> {
  const repo = deps?.repo ?? auditRepoImpl;
  const params = deps?.params;

  const audits = await repo.list(params);

  return audits;
}

export default listAudits;
