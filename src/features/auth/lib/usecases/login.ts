// ------------------------------------------------------------------------------------
// Login use case (client-side).
// - Valida credenciales con Zod.
// - Invoca el Route Handler POST /api/session.
// - Retorna { ok: true } si el login fue exitoso; lanza ApiError en caso de fallo.
// ------------------------------------------------------------------------------------

import { z } from "zod";
import { httpClient } from "@shared/api/http.client";
import type { ApiError } from "@shared/interceptors/error";
import { createApiError } from "@shared/interceptors/error";

// -----------------------------
// Tipos y validaciones
// -----------------------------

export const LoginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

type SessionResponseOk = Readonly<{ ok: true }>;
type SessionResponseErr = Readonly<{
  ok: false;
  code: string;
  message: string;
}>;
type SessionResponse = SessionResponseOk | SessionResponseErr;

// -----------------------------
// Use cases
// -----------------------------

/**
 * Performs login against our Next.js route (/api/session).
 * - On success, httpOnly cookies are set by the server; nothing sensitive is returned to the client.
 * - On failure, throws ApiError with message in English.
 */
export async function loginWithPassword(
  input: LoginInput
): Promise<SessionResponseOk> {
  try {
    const parsed = LoginInputSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw <ApiError>{
        code: "VALIDATION_ERROR",
        message: first?.message ?? "Invalid credentials.",
        details: parsed.error.issues,
      };
    }

    const res = await httpClient.post<SessionResponse>("/api/session", {
      username: parsed.data.username,
      password: parsed.data.password,
    });

    if (res.status === 200 && (res.data as SessionResponseOk).ok === true) {
      // Éxito: el server ya dejó cookies httpOnly
      return { ok: true } as const;
    }

    // Si el server respondió JSON de error estandarizado
    const err = res.data as SessionResponseErr;
    if (err && err.ok === false) {
      throw <ApiError>{
        code: err.code || "AUTH_FAILED",
        message: err.message || "Authentication failed.",
        details: { status: res.status },
      };
    }

    // Fallback genérico
    throw <ApiError>{
      code: "AUTH_FAILED",
      message: `Authentication failed with HTTP ${res.status}.`,
      details: { status: res.status, body: res.data },
    };
  } catch (e) {
    // Normalizamos cualquier error a ApiError consistente
    throw createApiError(e);
  }
}

/**
 * Clears current session by calling DELETE /api/session.
 * - On success returns void. Cookies are removed server-side.
 */
export async function logout(): Promise<void> {
  try {
    const res = await httpClient.delete("/api/session");
    if (res.status !== 204) {
      throw <ApiError>{
        code: "LOGOUT_FAILED",
        message: `Logout failed with HTTP ${res.status}.`,
        details: { status: res.status },
      };
    }
  } catch (e) {
    throw createApiError(e);
  }
}
