import type { Role, User } from "../model/sessions";
import { parseCognitoGroups } from "@shared/auth/cognito-groups";

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
    // `??` no cubría el string vacío, así que un name en blanco del backend
    // dejaba el nombre vacío en pantalla en vez de caer al username.
    name: firstNonBlank(u.name, u.username, "User"),
    username: firstNonBlank(u.username, u.name, "user"),
    email: u.email ?? null,
    // El rol se valida contra los roles conocidos: antes se casteaba cualquier
    // string y un valor desconocido pasaba por rol válido.
    role: toRole(u.role),
    avatarUrl: u.avatarUrl ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
  };
}

// Orden de privilegio: si el token trae varios grupos, gana el más alto. Tomar
// el primero dejaba el rol a merced del orden en que Cognito los devuelve.
const ROLE_PRECEDENCE: readonly Role[] = [
  "administrator",
  "admin",
  "auditor",
  "viewer",
];

/** Elige el rol de dominio a partir de los grupos del token. */
function pickRole(groups: string[]): Role {
  const match = ROLE_PRECEDENCE.find((role) => groups.includes(role));
  // Un grupo que no es un rol de dominio (por ejemplo "qc") se respeta tal
  // cual, que es lo que hacía el mapper original.
  return match ?? ((groups[0] ?? "viewer") as Role);
}

/** Claims (JWT Cognito access token) → Dominio (User) */
export function mapCognitoClaimsToUser(
  claims: CognitoAccessTokenClaims
): User {
  // API Gateway serializa cognito:groups como "[admin qc]": leerlo sólo como
  // array dejaba al usuario sin grupo y lo degradaba a "viewer", perdiendo el
  // acceso a las pantallas de administración.
  const role = pickRole(parseCognitoGroups(claims["cognito:groups"]));
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

/** Roles de dominio; el resto de los grupos no habilita nada. */
const ROLES: readonly Role[] = ["administrator", "admin", "auditor", "viewer"];

/** toRole devuelve el rol cuando es conocido y "viewer" cuando no. */
function toRole(raw: unknown): Role {
  if (typeof raw !== "string") return "viewer";
  const trimmed = raw.trim();
  return ROLES.includes(trimmed as Role) ? (trimmed as Role) : "viewer";
}

/** firstNonBlank devuelve el primer valor con contenido. */
function firstNonBlank(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate;
    }
  }
  return "";
}
