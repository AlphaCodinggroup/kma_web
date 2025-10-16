// -----------------------------------------------------------------------------
// ApiError normalization for Axios-based HTTP clients.
// - Spanish comments explain reasoning and usage.
// - Contract: ApiError { code, message, details? }.
// - Ready to use with both browser and server axios instances.
// -----------------------------------------------------------------------------

import type { AxiosError, AxiosInstance } from "axios";

// Contrato de error centralizado para la app (UI, logs, boundary)
export type ApiError = Readonly<{
  code: string; // código estable y parseable por UI/lógica
  message: string; // mensaje legible en inglés
  details?: unknown; // cualquier metadata útil para debugging
}>;

// Type guard para detectar ApiError
export function isApiError(input: unknown): input is ApiError {
  if (!input || typeof input !== "object") return false;
  const any = input as Record<string, unknown>;
  return (
    typeof any.code === "string" &&
    typeof any.message === "string" &&
    (any.details === undefined || typeof any.details !== "undefined")
  );
}

// -----------------------------------------------------------------------------
// Mapeos y utilidades internas
// -----------------------------------------------------------------------------

// Nota: algunos proveedores (AWS Cognito) devuelven "__type": "NotAuthorizedException"
type AwsLikeError = {
  __type?: string;
  message?: string;
  code?: string;
  error?: string;
};

// Traduce valores típicos de AxiosError.code a códigos de dominio
function normalizeAxiosCode(code?: string): string | undefined {
  switch (code) {
    case "ECONNABORTED":
      return "TIMEOUT";
    case "ERR_NETWORK":
      return "NETWORK_ERROR";
    case "ERR_CANCELED":
      return "CANCELED";
    default:
      return undefined;
  }
}

// Extrae un posible código de proveedor AWS a un código corto estable
function normalizeAwsType(type?: string): string | undefined {
  if (!type) return undefined;
  // Puede venir "com.amazon.cognito....#NotAuthorizedException" o "NotAuthorizedException"
  const last = type.split("#").pop() ?? type;
  return last.trim() || undefined;
}

// Construye un código por status HTTP cuando aplica
function codeFromStatus(status?: number): string | undefined {
  if (!status) return undefined;
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  if (status >= 400) return "BAD_REQUEST";
  return undefined;
}

// Mensaje por defecto amigable
function defaultMessageFor(code?: string): string {
  switch (code) {
    case "TIMEOUT":
      return "The request timed out. Please try again.";
    case "NETWORK_ERROR":
      return "Network error. Please check your connection and try again.";
    case "CANCELED":
      return "The request was canceled.";
    case "UNAUTHORIZED":
      return "You are not authorized to perform this action.";
    case "FORBIDDEN":
      return "Access to this resource is forbidden.";
    case "NOT_FOUND":
      return "The requested resource was not found.";
    case "CONFLICT":
      return "The request could not be completed due to a conflict.";
    case "UNPROCESSABLE_ENTITY":
      return "The server could not process the request.";
    case "RATE_LIMITED":
      return "Too many requests. Please slow down and try again.";
    case "SERVER_ERROR":
      return "Unexpected server error. Please try again later.";
    case "BAD_REQUEST":
      return "Invalid request. Please review the submitted data.";
    default:
      return "Request failed. Please try again.";
  }
}

// -----------------------------------------------------------------------------
// Normalizadores de error
// -----------------------------------------------------------------------------

/**
 * Normaliza errores provenientes de AWS Cognito (o similares) al contrato ApiError.
 * Respeta el mensaje de `message` si viene del proveedor; si no, usa default.
 */
export function createApiErrorFromAwsLike(
  input: AwsLikeError,
  status?: number,
  fallback?: string
): ApiError {
  // Prioridad: __type → message
  const awsCode = normalizeAwsType(input.__type) ?? input.code;
  const code =
    awsCode?.trim() ||
    codeFromStatus(status) ||
    normalizeAxiosCode(undefined) ||
    "UNKNOWN_ERROR";

  // Preferimos message del proveedor; fallback en inglés si no existe
  const message =
    (typeof input.message === "string" && input.message.trim().length > 0
      ? input.message.trim()
      : undefined) ??
    fallback ??
    defaultMessageFor(code);

  return {
    code,
    message,
    details: {
      provider: "aws-cognito",
      status,
      raw: input,
    },
  };
}

/**
 * Normaliza un AxiosError (red, DNS, timeout, response con error, etc.) a ApiError.
 * Incluye manejo especial para payloads que parecen de AWS Cognito.
 */
export function createApiErrorFromAxios(err: AxiosError): ApiError {
  // Datos útiles de axios
  const status = err.response?.status;
  const url = err.config?.url;
  const method = (err.config?.method ?? "get").toUpperCase();

  // Si el payload parece AWS Cognito
  const data = err.response?.data as unknown;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const aws = data as AwsLikeError;
    if (aws.__type || aws.message || aws.code || aws.error) {
      // Mapeo NotAuthorizedException
      const apiErr = createApiErrorFromAwsLike(aws, status, err.message);
      return {
        ...apiErr,
        details: {
          ...(apiErr.details as object),
          url,
          method,
        },
      };
    }
  }

  // Genérico por status
  const fromStatus = codeFromStatus(status);
  const fromAxiosCode = normalizeAxiosCode(err.code);

  const code = fromStatus ?? fromAxiosCode ?? "UNKNOWN_ERROR";

  // Preferimos message contenido en payload genérico
  const msgFromBody =
    (data && typeof (data as any).message === "string"
      ? (data as any).message
      : undefined) ??
    (typeof err.message === "string" ? err.message : undefined);

  const message = msgFromBody ?? defaultMessageFor(code);

  return {
    code,
    message,
    details: {
      status,
      url,
      method,
      axiosCode: err.code,
      response: data,
    },
  };
}

/**
 * Normaliza cualquier error desconocido a ApiError seguro.
 */
export function createApiError(input: unknown): ApiError {
  // Si ya es ApiError, lo devolvemos tal cual
  if (isApiError(input)) return input;

  // Si es AxiosError, normalizamos como tal
  const maybeAxios = input as Partial<AxiosError>;
  if (
    maybeAxios &&
    typeof maybeAxios === "object" &&
    "isAxiosError" in maybeAxios
  ) {
    return createApiErrorFromAxios(maybeAxios as AxiosError);
  }

  // Si es Error estándar u objeto con message
  const message =
    (typeof (input as any)?.message === "string" && (input as any).message) ||
    defaultMessageFor(undefined);

  return {
    code: "UNKNOWN_ERROR",
    message,
    details: { raw: input },
  };
}

// -----------------------------------------------------------------------------
// Instalación del interceptor de errores en una instancia Axios
// -----------------------------------------------------------------------------

/**
 * Instala un interceptor de respuesta que:
 * - Deja pasar 2xx tal cual.
 * - Reintenta no.
 * - Lanza ApiError normalizado para el resto de casos.
 */
export function installErrorInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (res) => res, // éxito tal cual
    (err: AxiosError) => {
      // Convertimos SIEMPRE a ApiError para un manejo consistente en capas superiores
      const apiErr = createApiErrorFromAxios(err);
      return Promise.reject(apiErr);
    }
  );
}
