import { cookies } from "next/headers";
import { serverEnv } from "@shared/config/env";
import { decodeJwtPayload } from "@shared/lib/jwt";
import {
  mapCognitoClaimsToUser,
  type CognitoAccessTokenClaims,
} from "@entities/user/lib/mappers";
import { makeSession, type Session } from "@entities/user/model/sessions";

/**
 * Obtiene la sesión desde el access token httpOnly (server-side).
 * - Decodifica el payload JWT para extraer claims de rol (cognito:groups).
 * - Si el token falta/expiró/es inválido, retorna sesión no autenticada.
 */
export async function getServerSession(): Promise<Session> {
  const env = serverEnv();
  const jar = await cookies();
  const raw = jar.get(env.cookies.accessName)?.value;

  if (!raw) return makeSession(null);

  const claims = decodeJwtPayload<CognitoAccessTokenClaims>(raw);
  if (!claims) return makeSession(null);

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === "number" && claims.exp < now) {
    return makeSession(null);
  }

  try {
    const user = mapCognitoClaimsToUser(claims);
    return makeSession(user);
  } catch {
    return makeSession(null);
  }
}
