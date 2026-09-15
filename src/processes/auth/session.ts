import { cookies } from "next/headers";
import { serverEnv } from "@shared/config/env";
import { verifyAccessToken } from "@shared/auth/verify-access-token";
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

  // La firma se verifica contra el JWKS del pool: el rol del usuario sale de
  // estos claims y antes se aceptaban sin comprobar nada.
  const result = await verifyAccessToken(raw);
  if (!result.ok) return makeSession(null);

  try {
    const user = mapCognitoClaimsToUser(
      result.claims as unknown as CognitoAccessTokenClaims
    );
    return makeSession(user);
  } catch {
    return makeSession(null);
  }
}
