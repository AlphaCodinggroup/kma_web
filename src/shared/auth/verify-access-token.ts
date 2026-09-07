import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { serverEnv, PublicEnv } from "@shared/config/env";
import { decodeJwtPayload } from "@shared/lib/jwt";

/**
 * Verificación del access token de Cognito.
 *
 * Antes el rol del usuario (y por lo tanto el acceso a las pantallas de
 * administración) se derivaba de un JWT decodificado sin comprobar la firma:
 * cualquiera podía fabricar una cookie con `cognito:groups: ["admin"]`.
 * Acá se valida la firma contra el JWKS del pool, además del issuer y la
 * expiración.
 */

export type VerifiedClaims = JWTPayload & {
  sub?: string;
  username?: string;
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  email?: string;
  token_use?: string;
};

/** Motivo por el que un token no pudo aceptarse. */
export type VerificationFailure =
  | "missing-token"
  | "invalid-signature"
  | "expired"
  | "invalid-issuer"
  | "not-configured";

export type VerificationResult =
  | { ok: true; claims: VerifiedClaims; verified: boolean }
  | { ok: false; reason: VerificationFailure };

// El JWKS se cachea por URL: jose refresca las claves por su cuenta.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(url: string) {
  let jwks = jwksCache.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, jwks);
  }
  return jwks;
}

/** Sólo fuera de producción se acepta un token sin verificar. */
function allowsUnverified(): boolean {
  return PublicEnv.appEnv !== "production";
}

/** Reinicia la caché de claves. Sólo para tests. */
export function resetJwksCache(): void {
  jwksCache.clear();
}

/**
 * Verifica el access token y devuelve sus claims.
 *
 * Si no hay JWKS configurado, en producción falla cerrado; fuera de producción
 * decodifica el token sin verificar y lo marca con `verified: false` para que
 * el llamador pueda distinguirlo.
 */
export async function verifyAccessToken(
  token: string | undefined | null
): Promise<VerificationResult> {
  if (!token) return { ok: false, reason: "missing-token" };

  const { cognito } = serverEnv();

  if (!cognito.jwksUrl) {
    if (!allowsUnverified()) {
      return { ok: false, reason: "not-configured" };
    }
    const claims = decodeJwtPayload<VerifiedClaims>(token);
    if (!claims) return { ok: false, reason: "invalid-signature" };
    if (isExpired(claims)) return { ok: false, reason: "expired" };
    return { ok: true, claims, verified: false };
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(cognito.jwksUrl), {
      ...(cognito.issuer ? { issuer: cognito.issuer } : {}),
    });
    return { ok: true, claims: payload as VerifiedClaims, verified: true };
  } catch (error) {
    return { ok: false, reason: reasonFor(error) };
  }
}

function isExpired(claims: VerifiedClaims): boolean {
  return typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000);
}

function reasonFor(error: unknown): VerificationFailure {
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "ERR_JWT_EXPIRED") return "expired";
  if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") return "invalid-issuer";
  return "invalid-signature";
}

/** Extrae los grupos de Cognito tolerando array o cadena. */
export function groupsOf(claims: VerifiedClaims): string[] {
  const raw: unknown = claims["cognito:groups"];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim() !== "") {
    // API Gateway serializa los arrays como "[admin qc]".
    return raw
      .replace(/^\[|\]$/g, "")
      .split(/[,\s]+/)
      .map((group: string) => group.trim())
      .filter(Boolean);
  }
  return [];
}
