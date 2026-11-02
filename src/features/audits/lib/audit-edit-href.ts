import type { Route } from "next";

/** Ruta de edición (QC) de una auditoría. */
export type AuditEditRoute = Route<`/audits/${string}/edit`>;

// Sólo se vuelve al listado de auditorías o al detalle de un proyecto:
// cualquier otro destino se descarta para que `returnTo` no sirva como
// redirección abierta.
const PROJECT_RETURN_PATH = /^\/projects\/[^/?#\\]+(\?[^#]*)?$/;

const AUDITS_RETURN_PATH = /^\/audits(\?[^#\\]*)?$/;

const DEFAULT_BACK_HREF = "/audits" as Route;

/** Indica si `value` es un destino de vuelta permitido. */
export function isAllowedReturnPath(value: unknown): value is string {
  return typeof value === "string" && (PROJECT_RETURN_PATH.test(value) || AUDITS_RETURN_PATH.test(value));
}

/**
 * Arma la URL de edición de una auditoría.
 * - `auditor` viaja sólo si tiene texto.
 * - `returnTo` viaja sólo si es un destino permitido.
 */
export function buildAuditEditHref(
  auditId: string,
  options: { auditor?: string | null | undefined; returnTo?: string | undefined } = {}
): AuditEditRoute {
  const base = `/audits/${encodeURIComponent(auditId)}/edit`;
  const query: string[] = [];

  if (options.auditor && options.auditor.trim().length > 0) {
    query.push(`auditor=${encodeURIComponent(options.auditor)}`);
  }
  if (isAllowedReturnPath(options.returnTo)) {
    query.push(`returnTo=${encodeURIComponent(options.returnTo)}`);
  }

  return (query.length > 0 ? `${base}?${query.join("&")}` : base) as AuditEditRoute;
}

/** Destino del botón "Back" de la edición: el origen con sus filtros o Audits. */
export function resolveAuditBackHref(returnTo: string | undefined): Route {
  return isAllowedReturnPath(returnTo) ? (returnTo as Route) : DEFAULT_BACK_HREF;
}
