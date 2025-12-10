// -----------------------------------------------------------------------------
// Helper liviano para decodificar el payload de un JWT (base64url -> JSON).
// - No verifica firma; se usa solo para leer claims no sensibles en cliente/server.
// - Devuelve null si el token es inválido o el payload no es JSON.
// -----------------------------------------------------------------------------

export type JwtPayload = Record<string, unknown>;

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4;
  const padded =
    padLength === 0 ? normalized : normalized + "=".repeat(4 - padLength);

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

/**
 * Decodifica el payload de un JWT sin validar la firma.
 */
export function decodeJwtPayload<T extends JwtPayload = JwtPayload>(
  token: string | undefined | null
): T | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const json = base64UrlDecode(parts[1]);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}
