import type { AuditStatus, AuditType } from "@entities/audit/model";

export type AuditListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AuditStatus[];
  projectId?: string;
  facilityId?: string;
  sort?: {
    field: "createdAt" | "updatedAt" | "status" | "version";
    order: "asc" | "desc";
  };
};

/**
 * Repositorio de Audits.
 * Devuelve tipos de dominio ya mapeados (DTO → Dominio).
 */
export interface AuditRepo {
  list(): Promise<AuditType>;
}
