import type { AuditRepo } from "@entities/audit/api/audit.repo";
import auditRepoImpl from "@features/audits/api/audit.repo.impl";

type Deps = {
    repo: AuditRepo;
};

/**
 * deleteAudit
 * Caso de uso para eliminar una auditoría por ID.
 */
export async function deleteAudit(
    auditId: string,
    deps?: Partial<Deps>
): Promise<void> {
    const repo = deps?.repo ?? auditRepoImpl;
    await repo.delete(auditId);
}

export default deleteAudit;
