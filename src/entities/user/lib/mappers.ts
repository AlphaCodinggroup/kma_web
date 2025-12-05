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

/** Mapea string del backend a Role de dominio */
function mapRole(input?: string | null): Role {
  const v = String(input ?? "").toLowerCase();
  if (v === "administrator" || v === "admin") return "administrator";
  if (v === "auditor") return "auditor";
  return "viewer";
}

/** DTO → Dominio (User) con saneamiento y defaults */
export function mapUserDTOtoDomain(dto: unknown): User {
  const u = (dto ?? {}) as UserDTO;
  const id = u.id != null ? String(u.id) : "unknown";
  return {
    id,
    name: (u.name ?? u.username ?? "User").toString(),
    username: (u.username ?? u.name ?? "user").toString(),
    email: u.email ?? null,
    role: mapRole(u.role),
    avatarUrl: u.avatarUrl ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
  };
}
