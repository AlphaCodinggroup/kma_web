"use client";

import type { AuthRepo } from "@entities/user/api/auth.repo";
import { mapUserDTOtoDomain } from "@entities/user/lib/mappers";
import {
  makeSession,
  type Session,
  type User,
} from "@entities/user/model/sessions";

/** Respuestas esperadas de nuestros route handlers */
type LoginOk = { ok: true; user?: unknown | null };
type SessionState = { authenticated: boolean; user?: unknown | null };

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // permite que el navegador procese Set-Cookie httpOnly
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function del<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export class AuthRepoImpl implements AuthRepo {
  async login(input: { username: string; password: string }): Promise<Session> {
    const data = await postJSON<LoginOk>("/api/session", input);
    const user: User | null = data.user ? mapUserDTOtoDomain(data.user) : null;
    return makeSession(user);
  }

  async logout(): Promise<void> {
    await del<unknown>("/api/session");
  }

  async getSession(): Promise<Session> {
    // GET /api/session hoy devuelve solo { authenticated }, pero toleramos si luego incluye user
    const s = await getJSON<SessionState>("/api/session");
    const user: User | null = s.user ? mapUserDTOtoDomain(s.user) : null;
    return makeSession(user ?? (s.authenticated ? null : null));
  }
}

/** singleton simple para usar desde los usecases/UI */
export const authRepo = new AuthRepoImpl();
