import type { Role, User } from "../model/sessions";

/** UserDTO flexible para tolerar variantes del backend */
export type UserDTO = {
  id?: string | number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
};

export type CognitoAccessTokenClaims = {
  sub?: string;
  username?: string;
  email?: string;
  name?: string;
  "cognito:groups"?: string[];
  exp?: number;
};

/** DTO → Dominio (User) con saneamiento y defaults */
export function mapUserDTOtoDomain(dto: unknown): User {
  const u = (dto ?? {}) as UserDTO;
  const id = u.id != null ? String(u.id) : "unknown";
  return {
    id,
    name: (u.name ?? u.username ?? "User").toString(),
    username: (u.username ?? u.name ?? "user").toString(),
    email: u.email ?? null,
    role: (u.role ?? "viewer") as Role,
    avatarUrl: u.avatarUrl ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
  };
}

/** Claims (JWT Cognito access token) → Dominio (User) */
export function mapCognitoClaimsToUser(
  claims: CognitoAccessTokenClaims
): User {
  const group = Array.isArray(claims["cognito:groups"])
    ? claims["cognito:groups"]?.[0]
    : undefined;

  const role = (group ?? "viewer") as Role;
  const username = claims.username || claims.sub || "user";

  return {
    id: claims.sub ?? "unknown",
    name: claims.name || username,
    username,
    email: claims.email ?? null,
    role,
    avatarUrl: null,
    lastLoginAt: null,
  };
}
