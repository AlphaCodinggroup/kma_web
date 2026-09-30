// ---------------------------------------------------------------------------
// Tests para formatIsoToYmdHm: recorte de ISO sin cambiar de zona horaria.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { formatIsoToYmdHm } from "../date";

describe("formatIsoToYmdHm", () => {
  // Camino feliz: entradas ISO con "T" se recortan literalmente (sin TZ shift).
  it.each([
    ["2026-01-15T10:30:00Z", "2026-01-15 10:30"],
    ["2026-01-15T10:30:45.123Z", "2026-01-15 10:30"],
    ["2026-12-31T23:59:59+03:00", "2026-12-31 23:59"],
    ["  2026-01-15T00:00:00Z  ", "2026-01-15 00:00"],
  ])("slices ISO input %s into %s", (input, expected) => {
    expect(formatIsoToYmdHm(input)).toBe(expected);
  });

  // Entradas vacías o nulas devuelven el guión.
  it.each([
    [undefined, "-"],
    [null, "-"],
    ["", "-"],
    ["   ", "-"],
  ])("returns '-' for %s", (input, expected) => {
    expect(formatIsoToYmdHm(input as string | null | undefined)).toBe(expected);
  });

  // Fallback: sin "T" intenta parsear y normalizar a UTC.
  it("parses a non-ISO date and normalizes it to UTC", () => {
    const result = formatIsoToYmdHm("2026-01-15");
    expect(result).toBe("2026-01-15 00:00");
  });

  it("returns the raw string when the date cannot be parsed", () => {
    expect(formatIsoToYmdHm("not-a-date")).toBe("not-a-date");
  });

  // Una cadena con "T" pero demasiado corta cae al fallback de parseo.
  it("falls back when the string has a T but is too short", () => {
    // "2026-01-15T10" no cumple length >= tIdx + 6 → intenta Date.parse
    const result = formatIsoToYmdHm("2026-01-15T10");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  // Un "T" en posición 0 no se considera separador ISO.
  it("does not slice when T is the first character", () => {
    expect(formatIsoToYmdHm("Tomorrow")).toBe("Tomorrow");
  });
});
