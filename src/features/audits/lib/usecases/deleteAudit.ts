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
    // Un id vacío llegaba al repositorio y terminaba pegándole al endpoint de
    // colección en vez de al del recurso.
    if (!auditId?.trim()) {
      throw new Error("deleteAudit: auditId is required");
    }

    const repo = deps?.repo ?? auditRepoImpl;
    await repo.delete(auditId);
}

export default deleteAudit;
