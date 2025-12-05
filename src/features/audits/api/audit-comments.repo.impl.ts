import { httpClient } from "@shared/api/http.client";
import type {
  AuditCommentsRepo,
  ListAuditCommentsParams,
} from "@entities/audit/api/audit-comments.repo";
import type { AuditCommentsResult } from "@entities/audit/model/audit-comment";
import {
  type AuditCommentsResponseDTO,
  mapAuditCommentsResponseDTOToDomain,
} from "@entities/audit/lib/audit-comments.mappers";

/**
 * Implementación HTTP (axios) del repositorio de comentarios de auditoría.
 */
export class AuditCommentsRepoHttp implements AuditCommentsRepo {
  constructor(private readonly basePath: string = "/api/audits") {}

  /**
   * Lista comentarios de una auditoría (opcionalmente filtrados por stepId).
   */
  async list(params: ListAuditCommentsParams): Promise<AuditCommentsResult> {
    const { auditId, stepId } = params;

    const res = await httpClient.get<AuditCommentsResponseDTO>(
      `${this.basePath}/${encodeURIComponent(auditId)}/comments`,
      {
        params: stepId ? { step_id: stepId } : undefined,
      }
    );

    return mapAuditCommentsResponseDTOToDomain(res.data);
  }
}

/**
 * Singleton listo para inyectar en casos de uso / hooks.
 */
export const auditCommentsRepoImpl: AuditCommentsRepo =
  new AuditCommentsRepoHttp();
