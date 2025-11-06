// ------------------------------------------------------
// Instancia de Axios para el navegador.
// - Envía cookies (withCredentials) para sesión httpOnly.
// - Para rutas internas (/api/*) fuerza same-origin (sin CORS).
// - Para rutas externas relativas usa NEXT_PUBLIC_API_BASE_URL.
// - Timeouts y valores tomados desde PublicEnv.
// ------------------------------------------------------

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { PublicEnv } from "@shared/config/env";
import { installErrorInterceptor } from "@shared/interceptors/error";
import { installAuthInterceptor } from "@shared/interceptors/auth";

// Si estás en browser y definiste NEXT_PUBLIC_API_BASE_URL, se usa para llamadas EXTERNAS.
// Las rutas internas que empiecen con "/api/" se forzarán a same-origin más abajo.
const API_BASE_URL =
  (typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined)
    : undefined) ?? "/";

export const httpClient = axios.create({
  // Ojo: esta baseURL es el *fallback* para rutas externas relativas.
  baseURL: API_BASE_URL,
  timeout: PublicEnv.httpTimeoutMs,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

installErrorInterceptor(httpClient);
installAuthInterceptor(httpClient);

// ---------------------------
// Interceptores
// ---------------------------

// Request: forzar same-origin para Next Route Handlers (/api/*)
// y resolver Content-Type por defecto en POST/PUT/PATCH.
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";
    const isAbsolute = /^https?:\/\//i.test(url);
    const isInternal = url.startsWith("/api/");

    if (!isAbsolute && isInternal) {
      // IMPORTANTE: evitamos CORS en login/refresh y cualquier handler interno
      config.baseURL = ""; // same-origin
    } else if (!isAbsolute && !config.baseURL) {
      // Para rutas relativas externas sin baseURL explícita,
      // aplicamos la base pública del backend
      config.baseURL = API_BASE_URL;
    }

    // Content-Type JSON por defecto si no fue seteado
    if (
      config.method &&
      ["post", "put", "patch"].includes(config.method.toLowerCase())
    ) {
      const hdrs = (config.headers ?? {}) as Record<string, unknown>;
      const hasCT = "Content-Type" in hdrs || "content-type" in hdrs;
      if (!hasCT) {
        (config.headers as any)["Content-Type"] = "application/json";
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(
      new Error(
        error?.message ||
          "Request interceptor failed before sending the request."
      )
    );
  }
);

// Response: normalización de errores (se mantiene tu lógica)
httpClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const message =
      (err.response?.data as any)?.message ||
      (typeof err.message === "string" && err.message) ||
      "Network request failed.";
    const enriched = new Error(message);
    return Promise.reject(enriched);
  }
);

export default httpClient;
