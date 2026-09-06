/**
 * Coerciones defensivas para respuestas del backend.
 *
 * Vivían como copias privadas en cada mapper (toNumber ×4, toIso ×3, toBool ×2)
 * y habían divergido: la del dashboard usaba `Number(value)`, que convierte
 * `null` en 0 y `true` en 1, ignorando el fallback. Una sola definición evita
 * que un arreglo se quede a mitad de camino.
 */

/** Convierte a número finito; cualquier otra cosa cae en `fallback`. */
export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value))
  ) {
    return Number(value);
  }
  return fallback;
};

/** Acepta booleanos, "true"/"false" y números al estilo C. */
export const toBool = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  if (typeof value === "number") return value !== 0;
  return fallback;
};

/** Normaliza a string vacío en lugar de "null"/"undefined". */
export const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
};

/**
 * Normaliza una fecha ISO recibida del backend.
 *
 * `IsoDateString` es un alias de `string`, así que el valor se devuelve tal cual
 * viene, recortado, y el llamador conserva su tipo de dominio.
 */
export const toIsoDate = (value?: string | null, fallback = ""): string =>
  (value ?? fallback).trim();
