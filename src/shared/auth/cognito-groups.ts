/**
 * Lectura del claim `cognito:groups`.
 *
 * Cognito lo emite como array, pero API Gateway lo serializa como la cadena
 * "[admin qc]" al pasarlo por el autorizador JWT. Leerlo sólo como array dejaba
 * al usuario sin grupo y lo degradaba a "viewer", perdiéndose el acceso de
 * administración.
 *
 * Vive aparte de verify-access-token para que el mapper de dominio pueda
 * reutilizarlo sin arrastrar `jose` al bundle del navegador.
 */
export function parseCognitoGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);

  if (typeof raw === "string" && raw.trim() !== "") {
    return raw
      .replace(/^\[|\]$/g, "")
      .split(/[,\s]+/)
      .map((group) => group.trim())
      .filter(Boolean);
  }

  return [];
}
