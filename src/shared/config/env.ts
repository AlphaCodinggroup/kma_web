import { z } from "zod";

/**
 * Validación de variables de entorno (server + client-safe).
 * - NEXT_PUBLIC_API_BASE_URL: URL del backend (se usa en server routes).
 * - AUTH_ACCESS_COOKIE / AUTH_REFRESH_COOKIE: nombres de cookies httpOnly.
 * - AUTH_COOKIE_DOMAIN: dominio opcional para setear cookies si aplica.
 */
const EnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url({
    message: "NEXT_PUBLIC_API_BASE_URL debe ser una URL válida (https://...)",
  }),

  AUTH_ACCESS_COOKIE: z.string().min(1).default("kma_access"),
  AUTH_REFRESH_COOKIE: z.string().min(1).default("kma_refresh"),
  AUTH_COOKIE_DOMAIN: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,

  AUTH_ACCESS_COOKIE: process.env.AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE: process.env.AUTH_REFRESH_COOKIE,
  AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,

  NODE_ENV: process.env.NODE_ENV,
});

export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
