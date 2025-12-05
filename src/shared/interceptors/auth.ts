// --------------------------------------------------------------------------------------
// Axios auth interceptor (client-side) con refresh queue.
// - Detecta 401 en requests a "/api/*" (mismo origen).
// - Ejecuta UNA sola llamada POST /api/session/refresh mientras dure el refresh.
// - Encola las requests concurrentes; al finalizar, reintenta la request original.
// - Si el refresh falla, rechaza con UNAUTHORIZED y NO entra en loops.
// --------------------------------------------------------------------------------------

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { createApiError, type ApiError } from "@shared/interceptors/error";

// -----------------------------
// Config / helpers internos
// -----------------------------

// Rutas a excluir del mecanismo de refresh para evitar loops
const EXCLUDED_PATHS = new Set<string>([
  "/api/session",
  "/api/session/refresh",
]);

// Marca interna para evitar reintentos infinitos
type RetriableConfig = InternalAxiosRequestConfig & { __isRetry__?: boolean };

// Determina si la URL pertenece a nuestras APIs internas
function isInternalApiUrl(url?: string | null): boolean {
  if (!url) return false;
  // Solo manejamos rutas relativas que comienzan con /api/
  return url.startsWith("/api/");
}

// Determina si la URL está excluida de la lógica de refresh
function isExcluded(url?: string | null): boolean {
  if (!url) return false;
  // Normalizamos por si viniera con querystring
  const pathname = url.split("?")[0] ?? url;
  return EXCLUDED_PATHS.has(pathname);
}

// -----------------------------
// Refresh queue (estado global del módulo)
// -----------------------------

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// Cola de resolvers para ejecutar cuando termine el refresh
type QueueEntry = {
  resolve: () => void;
  reject: (err: unknown) => void;
};
const queue: QueueEntry[] = [];

/** Encola una promesa que se resolverá cuando termine el refresh. */
function enqueue(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    queue.push({ resolve, reject });
  });
}

/** Notifica a toda la cola que el refresh finalizó (ok = true/false). */
function flushQueue(ok: boolean, error?: unknown) {
  while (queue.length) {
    const { resolve, reject } = queue.shift()!;
    if (ok) resolve();
    else reject(error);
  }
}

// -----------------------------
// Cliente para /api/session/refresh
// -----------------------------

// Nota: usamos una instancia simple para evitar que el propio interceptor
// intercepte el 401 de /api/session/refresh y genere recursión.
const refreshClient = axios.create({
  baseURL: "/",
  withCredentials: true, // importante para enviar cookies httpOnly
  timeout: 15_000,
});

// -----------------------------
// Instalación del interceptor
// -----------------------------

/**
 * Instala el auth interceptor en una instancia de Axios (cliente).
 * - Debe llamarse una sola vez sobre httpClient.
 */
export function installAuthInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    // Pasamos 2xx sin cambios
    (res: AxiosResponse) => res,

    // Manejamos errores
    async (error: AxiosError) => {
      try {
        const status = error.response?.status;
        const originalConfig = (error.config || {}) as RetriableConfig;
        const url = originalConfig.url ?? "";

        // Si NO es 401 o NO es una URL interna /api, dejamos pasar el error
        if (status !== 401 || !isInternalApiUrl(url)) {
          throw error;
        }

        // No intentamos refresh para endpoints de session (evita loops)
        if (isExcluded(url)) {
          throw error;
        }

        // Evitar reintentos infinitos en la misma request
        if (originalConfig.__isRetry__ === true) {
          // Ya reintentamos una vez y falló → propagamos UNAUTHORIZED
          throw <ApiError>{
            code: "UNAUTHORIZED",
            message: "Unauthorized request after refresh attempt.",
            details: { url, status },
          };
        }

        // En este punto, vamos a intentar refresh de sesión.
        // Si ya hay un refresh en curso, nos encolamos.
        if (isRefreshing && refreshPromise) {
          await enqueue();
        } else {
          // Iniciar un refresh nuevo
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const res = await refreshClient.post("/api/session/refresh");
              if (res.status !== 200) {
                // Falló el refresh (p.ej., 401) → rechazamos
                throw <ApiError>{
                  code: "UNAUTHORIZED",
                  message: `Session refresh failed with HTTP ${res.status}.`,
                  details: { status: res.status },
                };
              }
              // OK → resolvemos la cola
              flushQueue(true);
            } catch (e) {
              // Error de refresh → rechazamos la cola y propagamos
              flushQueue(false, e);
              throw e;
            } finally {
              isRefreshing = false;
              refreshPromise = null;
            }
          })();

          // Esperamos a que finalice el refresh actual
          await refreshPromise;
        }

        // Si llegamos aquí, el refresh fue exitoso.
        // Marcamos la request original para evitar bucles y reintentamos.
        originalConfig.__isRetry__ = true;

        // Importante: Axios conserva body y headers en originalConfig.
        // Reintentamos con la MISMA instancia para respetar interceptores.
        return instance.request(originalConfig);
      } catch (e) {
        // Normalizamos y propagamos un ApiError consistente
        throw createApiError(e);
      }
    }
  );
}
