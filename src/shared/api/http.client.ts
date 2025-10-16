// ------------------------------------------------------
// Instancia de Axios para el navegador.
// - Envía cookies (withCredentials) para sesión httpOnly.
// - BaseURL: usa NEXT_PUBLIC_API_BASE_URL si existe; caso
//   contrario, relativo a la misma origin ("/").
// - Timeouts y valores tomados desde PublicEnv.
// ------------------------------------------------------

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { PublicEnv } from "@shared/config/env";
import { installErrorInterceptor } from "@shared/interceptors/error";
import { installAuthInterceptor } from "@shared/interceptors/auth";

// Nota: mantenemos soporte para un backend propio bajo /api (Next Route Handlers).
// Si definís NEXT_PUBLIC_API_BASE_URL, se respeta. Si no, usamos "/" y
// cada feature podrá pasar paths absolutos o relativos (p. ej., "/api/session").

const API_BASE_URL =
  (typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined)
    : undefined) ?? "/";

export const httpClient = axios.create({
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

// Request: espacio reservado por si luego agregamos correlación, idempotencia, etc.
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

// Response: normalización de errores
httpClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const url = err.config?.url;

    const message =
      (err.response?.data as any)?.message ||
      (typeof err.message === "string" && err.message) ||
      "Network request failed.";

    const enriched = new Error(message);

    return Promise.reject(enriched);
  }
);
