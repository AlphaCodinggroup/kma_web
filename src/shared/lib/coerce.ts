/**
 * Coerciones compartidas para los mappers de DTO a dominio.
 *
 * Estaban repetidas y con criterios distintos en cada entidad: un numérico que
 * el backend manda como string se descartaba, un cuerpo malformado rompía el
 * mapper y una fecha inválida se propagaba tal cual a la interfaz.
 */

/**
 * toFiniteNumber acepta un número o un string numérico y devuelve `fallback`
 * cuando el valor no es utilizable. El 0 es un valor válido.
 */
export function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * toIsoDateOrNull devuelve la fecha cuando es parseable y null cuando no.
 *
 * Propagar una fecha inválida a la interfaz termina en un "Invalid Date" en
 * pantalla; ausente es la respuesta honesta.
 */
export function toIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed === "") return null;

  return Number.isNaN(new Date(trimmed).getTime()) ? null : trimmed;
}

/**
 * toIsoDate es la variante que conserva el contrato de los modelos que
 * declaran la fecha como string no nulo: una fecha inválida queda vacía.
 */
export function toIsoDate(value: unknown): string {
  return toIsoDateOrNull(value) ?? "";
}

/** asArray devuelve el arreglo recibido, o uno vacío si no lo es. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
