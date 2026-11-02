import type { AuditStatus } from "@entities/audit/model";

/**
 * Normalización única del estado de una auditoría.
 *
 * Estaba duplicada en cuatro mappers y en los cuatro la lista blanca era
 * decorativa: `allowed.includes(raw) ? raw : raw` y `raw ?? default` devolvían
 * igual el valor desconocido, que entraba al dominio como AuditStatus y rompía
 * cualquier switch exhaustivo aguas abajo.
 */

/** Estados que el backend puede emitir (shared/statemachine). */
export const AUDIT_STATUSES: readonly AuditStatus[] = [
  "audit_in_progress",
  "draft_report_pending_review",
  "draft_report_in_review",
  "final_report_sent_to_client",
  "completed",
  "deleted",
] as const;

/** Un dato ausente nunca se convierte en trabajo pendiente. */
export const DEFAULT_AUDIT_STATUS: AuditStatus = "unknown";

/** isAuditStatus indica si la cadena es uno de los estados conocidos. */
export function isAuditStatus(raw: unknown): raw is AuditStatus {
  return (
    typeof raw === "string" && AUDIT_STATUSES.includes(raw as AuditStatus)
  );
}

/**
 * toAuditStatus conserva el estado conocido y señala los datos desconocidos.
 *
 * Cubre también la cadena vacía y el valor ausente, que con `??` se colaban.
 */
export function toAuditStatus(raw: unknown): AuditStatus {
  return isAuditStatus(raw) ? raw : DEFAULT_AUDIT_STATUS;
}
