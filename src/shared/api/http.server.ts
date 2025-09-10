import axios, { type AxiosInstance } from "axios";
import { cookies } from "next/headers";
import { env } from "@shared/config/env";

/** Error normalizado para toda la app */
export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

/** Compat: Next 14 (sync) / Next 15 (async) */
async function getCookieStore() {
  const c = cookies() as any;
  return typeof c?.then === "function" ? await c : c;
}

/**
 * Crea una instancia Axios para uso en el SERVIDOR (App Router):
 * - Adjunta Authorization: Bearer <access> leyendo cookie httpOnly
 *   en un interceptor de request (async).
 * - Normaliza errores a ApiError en response.
 */
export function createServerHttp(): AxiosInstance {
  const instance = axios.create({
    baseURL: env.NEXT_PUBLIC_API_BASE_URL,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
  });

  // Interceptor de request: adjunta token desde cookies httpOnly (si existe)
  instance.interceptors.request.use(
    async (config) => {
      try {
        const store = await getCookieStore();
        const access = store?.get(env.AUTH_ACCESS_COOKIE)?.value;
        if (access) {
          config.headers = config.headers ?? {};
          (config.headers as any).Authorization = `Bearer ${access}`;
        } else if (config?.headers && "Authorization" in config.headers) {
          // Limpia si no hay token
          delete (config.headers as any).Authorization;
        }
      } catch {
        // noop: si falla la lectura de cookies, seguimos sin Authorization
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Interceptor de response: normalización de errores → ApiError
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status;
      const data = err?.response?.data as { message?: string } | undefined;

      const apiErr: ApiError = {
        code: typeof status === "number" ? String(status) : "NETWORK_ERROR",
        message: data?.message ?? err.message ?? "Request failed",
        details: data ?? undefined,
      };
      return Promise.reject(apiErr);
    }
  );

  return instance;
}
