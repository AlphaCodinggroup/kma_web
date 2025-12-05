// ---------------------------------------------
// Validación de variables de entorno con Zod,
// separación Public (NEXT_PUBLIC_*) vs Server,
// y helpers tipados para consumo en cliente/servidor.
// ---------------------------------------------

import { z } from "zod";

// -- Helpers internos ------------------------------------
// Nota: convertidores robustos para números y booleanos.

const toInt = (v: unknown, fallback?: number): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number.parseInt(v, 10);
  }
  if (typeof fallback === "number") return fallback;
  throw new Error(`Expected a valid integer number, received: ${String(v)}`);
};

const toBool = (v: unknown, fallback?: boolean): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const n = v.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(n)) return true;
    if (["false", "0", "no", "n"].includes(n)) return false;
  }
  if (typeof fallback === "boolean") return fallback;
  throw new Error(`Expected a boolean-like value, received: ${String(v)}`);
};

// -- Schemas de validación -------------------------------

// Variables públicas (pueden exponerse al cliente)
const PublicSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, "NEXT_PUBLIC_APP_NAME is required"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .refine(
      Boolean,
      "NEXT_PUBLIC_APP_ENV must be one of: development|staging|production"
    ),
  NEXT_PUBLIC_AUTH_BASE_URL: z
    .string()
    .url("NEXT_PUBLIC_AUTH_BASE_URL must be a valid URL"),
  NEXT_PUBLIC_HTTP_TIMEOUT_MS: z
    .string()
    .min(1, "NEXT_PUBLIC_HTTP_TIMEOUT_MS is required"),
  NEXT_PUBLIC_QUERY_STALE_TIME: z
    .string()
    .min(1, "NEXT_PUBLIC_QUERY_STALE_TIME is required"),
  // NUEVO: Base URL del backend público (sin token aquí)
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url("NEXT_PUBLIC_API_BASE_URL must be a valid URL"),
});

// Variables de servidor
const ServerSchema = z.object({
  COGNITO_REGION: z.string().min(1, "COGNITO_REGION is required"),
  COGNITO_CLIENT_ID: z.string().min(1, "COGNITO_CLIENT_ID is required"),
  // Opcionales para validación de tokens/JWKS en server
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_JWKS_URL: z.string().url().optional(),

  // Cookies httpOnly
  SESSION_COOKIE_NAME: z.string().min(1, "SESSION_COOKIE_NAME is required"),
  ACCESS_TOKEN_COOKIE_NAME: z
    .string()
    .min(1, "ACCESS_TOKEN_COOKIE_NAME is required"),
  REFRESH_TOKEN_COOKIE_NAME: z
    .string()
    .min(1, "REFRESH_TOKEN_COOKIE_NAME is required"),
  COOKIE_SECURE: z.string().min(1, "COOKIE_SECURE is required"),
  COOKIE_SAMESITE: z.enum(["Lax", "Strict", "None"], {
    errorMap: () => ({
      message: "COOKIE_SAMESITE must be 'Lax' | 'Strict' | 'None'",
    }),
  }),
  COOKIE_DOMAIN: z.string().optional(),

  // Retries/Backoff HTTP
  HTTP_RETRY_MAX_ATTEMPTS: z
    .string()
    .min(1, "HTTP_RETRY_MAX_ATTEMPTS is required"),
  HTTP_RETRY_BASE_DELAY_MS: z
    .string()
    .min(1, "HTTP_RETRY_BASE_DELAY_MS is required"),
});

// -- Carga y parseo seguro -------------------------------

/**
 * Lee y valida variables NEXT_PUBLIC_*.
 * Seguro para ejecutarse tanto en servidor como en cliente.
 */
function loadPublicEnv() {
  const parsed = PublicSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_AUTH_BASE_URL: process.env.NEXT_PUBLIC_AUTH_BASE_URL,
    NEXT_PUBLIC_HTTP_TIMEOUT_MS: process.env.NEXT_PUBLIC_HTTP_TIMEOUT_MS,
    NEXT_PUBLIC_QUERY_STALE_TIME: process.env.NEXT_PUBLIC_QUERY_STALE_TIME,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `- ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid public environment configuration:\n${issues}\n` +
        `Please check your .env.local and ensure NEXT_PUBLIC_* variables are correct.`
    );
  }

  // Parseo de tipos derivados
  const pub = parsed.data;

  const PUBLIC_HTTP_TIMEOUT_MS = toInt(pub.NEXT_PUBLIC_HTTP_TIMEOUT_MS);
  const PUBLIC_QUERY_STALE_TIME = toInt(pub.NEXT_PUBLIC_QUERY_STALE_TIME);

  return {
    appName: pub.NEXT_PUBLIC_APP_NAME,
    appEnv: pub.NEXT_PUBLIC_APP_ENV,
    authBaseUrl: pub.NEXT_PUBLIC_AUTH_BASE_URL,
    httpTimeoutMs: PUBLIC_HTTP_TIMEOUT_MS,
    queryStaleTimeMs: PUBLIC_QUERY_STALE_TIME,
    // NUEVO
    apiBaseUrl: pub.NEXT_PUBLIC_API_BASE_URL,
  } as const;
}

/**
 * Lee y valida variables del servidor.
 * Lanza error si se llama desde el cliente.
 */
function loadServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must be called on the server only.");
  }

  const parsed = ServerSchema.safeParse({
    COGNITO_REGION: process.env.COGNITO_REGION,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_JWKS_URL: process.env.COGNITO_JWKS_URL,

    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    ACCESS_TOKEN_COOKIE_NAME: process.env.ACCESS_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME: process.env.REFRESH_TOKEN_COOKIE_NAME,
    COOKIE_SECURE: process.env.COOKIE_SECURE,
    COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,

    HTTP_RETRY_MAX_ATTEMPTS: process.env.HTTP_RETRY_MAX_ATTEMPTS,
    HTTP_RETRY_BASE_DELAY_MS: process.env.HTTP_RETRY_BASE_DELAY_MS,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `- ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment configuration:\n${issues}\n` +
        `Please check your .env.local and ensure required variables are present.`
    );
  }

  const env = parsed.data;

  // Normalizaciones de tipo
  const HTTP_RETRY_MAX_ATTEMPTS = toInt(env.HTTP_RETRY_MAX_ATTEMPTS);
  const HTTP_RETRY_BASE_DELAY_MS = toInt(env.HTTP_RETRY_BASE_DELAY_MS);
  const COOKIE_SECURE = toBool(env.COOKIE_SECURE);

  return {
    cognito: {
      region: env.COGNITO_REGION,
      clientId: env.COGNITO_CLIENT_ID,
      userPoolId: env.COGNITO_USER_POOL_ID,
      jwksUrl: env.COGNITO_JWKS_URL,
    },
    cookies: {
      sessionName: env.SESSION_COOKIE_NAME,
      accessName: env.ACCESS_TOKEN_COOKIE_NAME,
      refreshName: env.REFRESH_TOKEN_COOKIE_NAME,
      secure: COOKIE_SECURE,
      sameSite: env.COOKIE_SAMESITE as "Lax" | "Strict" | "None",
      domain: env.COOKIE_DOMAIN,
    },
    httpRetry: {
      maxAttempts: HTTP_RETRY_MAX_ATTEMPTS,
      baseDelayMs: HTTP_RETRY_BASE_DELAY_MS,
    },
  } as const;
}

// -- API pública del módulo -------------------------------

// Export seguro para usar en cualquier lugar (cliente/servidor).
export const PublicEnv = loadPublicEnv();

// Función para acceder a env de servidor (no importa en cliente).
export function serverEnv() {
  return loadServerEnv();
}

// Utils de conveniencia
export const isProd = () => PublicEnv.appEnv === "production";
export const isStaging = () => PublicEnv.appEnv === "staging";
export const isDev = () => PublicEnv.appEnv === "development";

// Tipos útiles para DX
export type PublicEnvType = ReturnType<typeof loadPublicEnv>;
export type ServerEnvType = ReturnType<typeof loadServerEnv>;
