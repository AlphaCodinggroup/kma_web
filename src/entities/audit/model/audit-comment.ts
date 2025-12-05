import type { IsoDateString } from "@entities/audit/model";

/**
 * Comentario asociado a una auditoría, referenciado a un paso/pregunta.
 */
export interface AuditComment {
  id: string;
  userId: string;
  stepId: string;
  content: string;
  createdAt: IsoDateString;
  version: number;
}

/**
 * Resultado de la operación de listado de comentarios de una auditoría.
 */
export interface AuditCommentsResult {
  comments: AuditComment[];
}
