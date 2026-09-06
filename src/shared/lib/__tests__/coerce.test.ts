import { describe, expect, it } from "vitest";

import { toBool, toIsoDate, toNumber, toText } from "../coerce";

describe("toNumber", () => {
  it("keeps finite numbers and parses numeric strings", () => {
    expect(toNumber(3)).toBe(3);
    expect(toNumber("4.5")).toBe(4.5);
    expect(toNumber(" 7 ")).toBe(7);
  });

  it("falls back for every value that is not a number", () => {
    // La copia del dashboard devolvía 0 para null y 1 para true, ignorando el
    // fallback: ése era el comportamiento divergente.
    expect(toNumber(null, 5)).toBe(5);
    expect(toNumber(undefined, 5)).toBe(5);
    expect(toNumber(true, 5)).toBe(5);
    expect(toNumber("", 5)).toBe(5);
    expect(toNumber("abc", 5)).toBe(5);
    expect(toNumber(Number.NaN, 5)).toBe(5);
    expect(toNumber(Number.POSITIVE_INFINITY, 5)).toBe(5);
  });
});

describe("toBool", () => {
  it("reads booleans, strings and numbers", () => {
    expect(toBool(true)).toBe(true);
    expect(toBool("TRUE")).toBe(true);
    expect(toBool(" true ")).toBe(true);
    expect(toBool("false")).toBe(false);
    expect(toBool(1)).toBe(true);
    expect(toBool(0)).toBe(false);
  });

  it("falls back for anything else", () => {
    expect(toBool(null, true)).toBe(true);
    expect(toBool(undefined)).toBe(false);
    expect(toBool({}, true)).toBe(true);
  });
});

describe("toText", () => {
  it("never renders null or undefined as text", () => {
    expect(toText("a")).toBe("a");
    expect(toText(null)).toBe("");
    expect(toText(undefined)).toBe("");
    expect(toText(12)).toBe("12");
  });
});

describe("toIsoDate", () => {
  it("trims the value and applies the fallback when it is missing", () => {
    expect(toIsoDate(" 2026-01-02T03:04:05Z ")).toBe("2026-01-02T03:04:05Z");
    expect(toIsoDate(null)).toBe("");
    expect(toIsoDate(undefined, "2026-01-01T00:00:00Z")).toBe("2026-01-01T00:00:00Z");
  });
});
