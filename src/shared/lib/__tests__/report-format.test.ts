/**
 * Formatos del PDF del reporte: moneda, unidades, mediciones y las líneas de
 * la mitigación, iguales a los de reports-worker.
 */
import { describe, expect, it } from "vitest";
import {
  formatMeasurementLines,
  formatQuantityValue,
  formatReportAmount,
  formatReportCurrency,
  formatUnitCostLine,
  mitigationUnitLabel,
  normalizeUnitLabel,
} from "../report-format";

describe("formatReportAmount", () => {
  it.each([
    [0, "0"],
    [5, "5"],
    [833.333, "833.33"],
    [1234, "1,234"],
    [2500.5, "2,500.50"],
    [1234567.891, "1,234,567.89"],
  ])("formats %s as %s", (amount, expected) => {
    expect(formatReportAmount(amount)).toBe(expected);
  });

  it("prefixes the currency", () => {
    expect(formatReportCurrency(2500)).toBe("$2,500");
  });
});

describe("unit labels", () => {
  it.each([
    ["ea.", "EA"],
    [" sf ", "SF"],
    ["", ""],
    [null, ""],
  ])("normalizes %j to %j", (raw, expected) => {
    expect(normalizeUnitLabel(raw)).toBe(expected);
  });

  it("uses EA for a mitigation without unit", () => {
    expect(mitigationUnitLabel(null)).toBe("EA");
    expect(mitigationUnitLabel("lf")).toBe("LF");
  });
});

describe("formatMeasurementLines", () => {
  it("labels the measurements by position", () => {
    expect(
      formatMeasurementLines([
        { value: 45, unit: '"' },
        { value: 3.2, unit: "%" },
        { value: 12, unit: "in." },
      ])
    ).toEqual(['Measurement: 45"', "Measurement 1: 3.2%", "Measurement 2: 12 IN"]);
  });

  it("skips measurements without a positive value and falls back past the third label", () => {
    expect(
      formatMeasurementLines([
        { value: 0, unit: null },
        { value: 9.5, unit: null },
        { value: -1, unit: null },
        { value: 7, unit: "ft" },
      ])
    ).toEqual(["Measurement 1: 9.5", "Measurement: 7 FT"]);
  });
});

describe("mitigation lines", () => {
  it.each([
    [3, "EA", "3"],
    [2.5, "LF", "2.5 LF"],
    [4, "", "4"],
  ])("formats a quantity of %s %s as %j", (quantity, unit, expected) => {
    expect(formatQuantityValue(quantity, unit)).toBe(expected);
  });

  it("prints the unit cost with its unit", () => {
    expect(formatUnitCostLine(833.333, "EA")).toBe("Unit Cost: $833.33 EA");
    expect(formatUnitCostLine(1200, "")).toBe("Unit Cost: $1,200");
  });
});
