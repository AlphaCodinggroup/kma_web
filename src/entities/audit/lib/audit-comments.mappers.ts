import type { IsoDateString } from "@entities/audit/model";
import type {
  AuditComment,
  AuditCommentsResult,
} from "@entities/audit/model/audit-comment";

export type AuditCommentDTO = {
  id: string;
  user_id: string;
  step_id: string;
  content: string;
  created_at: string;
  version: number;
};

/**
 * GET /api/audits/{audit_id}/comment
 */
export type AuditCommentsResponseDTO = {
  comments: AuditCommentDTO[];
};

const toIsoDate = (value?: string | null): IsoDateString => {
  const raw = (value ?? "").trim();
  return raw as IsoDateString;
};

/**
 * Mapea un comentario individual DTO → dominio.
 */
export const mapAuditCommentDTOToDomain = (
  dto: AuditCommentDTO
): AuditComment => {
  return {
    id: dto.id,
    userId: dto.user_id,
    stepId: dto.step_id,
    content: dto.content?.trim() ?? "",
    createdAt: toIsoDate(dto.created_at),
    version: Number.isFinite(dto.version) ? dto.version : 1,
  };
};

/**
 * Mapea la respuesta del endpoint de listado de comentarios a modelo de dominio.
 */
export const mapAuditCommentsResponseDTOToDomain = (
  res: AuditCommentsResponseDTO
): AuditCommentsResult => {
  const items = Array.isArray(res?.comments) ? res.comments : [];
  return {
    comments: items.map(mapAuditCommentDTOToDomain),
  };
};
