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
  "draft_report_pending_review",
  "draft_report_in_review",
  "final_report_sent_to_client",
  "completed",
] as const;

/** Estado inicial, al que cae cualquier valor que no esté en la lista. */
export const DEFAULT_AUDIT_STATUS: AuditStatus = "draft_report_pending_review";

/** isAuditStatus indica si la cadena es uno de los estados conocidos. */
export function isAuditStatus(raw: unknown): raw is AuditStatus {
  return (
    typeof raw === "string" && AUDIT_STATUSES.includes(raw as AuditStatus)
  );
}

/**
 * toAuditStatus devuelve el estado cuando es conocido y el inicial cuando no.
 *
 * Cubre también la cadena vacía y el valor ausente, que con `??` se colaban.
 */
export function toAuditStatus(raw: unknown): AuditStatus {
  return isAuditStatus(raw) ? raw : DEFAULT_AUDIT_STATUS;
}
