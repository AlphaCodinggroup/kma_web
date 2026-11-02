import { createApiError, type ApiError } from "@shared/interceptors/error";

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Conserva el código/status del proxy y recupera el mensaje del sobre de Go. */
export function normalizeCatalogError(cause: unknown): ApiError {
  const normalized = createApiError(cause);
  const details = object(normalized.details);
  for (const envelope of [object(details?.raw), object(details?.response)]) {
    const message = object(envelope?.error)?.message;
    if (typeof message === "string" && message.trim()) {
      return { ...normalized, message: message.trim() };
    }
  }
  return normalized;
}
