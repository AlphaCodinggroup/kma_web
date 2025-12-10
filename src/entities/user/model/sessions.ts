export type Role = "administrator" | "admin" | "auditor" | "viewer";

export type User = {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: Role;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
};

export type Session = {
  user: User | null;
  authenticated: boolean;
};

export function makeSession(user: User | null): Session {
  return { user, authenticated: Boolean(user) };
}
