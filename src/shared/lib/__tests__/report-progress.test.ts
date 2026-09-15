import { describe, expect, it } from "vitest";
import {
  estimateGenerationPercent,
  formatBytes,
  monotonic,
} from "../report-progress";

describe("estimateGenerationPercent", () => {
  it.each([
    [1_000, 500, 30_000, 10],
    [1_000, 1_000, 30_000, 10],
    [1_000, 16_000, 30_000, 47],
    [1_000, 31_000, 30_000, 85],
    [1_000, 99_000, 30_000, 85],
    [1_000, 2_000, 0, 89],
  ])("estimates a bounded value", (start, now, estimate, expected) => {
    expect(estimateGenerationPercent(start, now, estimate)).toBe(expected);
  });
});

describe("monotonic", () => {
  it.each([
    [null, null, null],
    [null, 20, 20],
    [30, null, 30],
    [30, 20, 30],
    [30, 40, 40],
  ])("never moves backwards", (previous, next, expected) => {
    expect(monotonic(previous, next)).toBe(expected);
  });
});

describe("formatBytes", () => {
  it.each([
    [Number.NaN, "0 B"],
    [-1, "0 B"],
    [0, "0 B"],
    [512, "512 B"],
    [1536, "1.5 KB"],
    [12 * 1024, "12 KB"],
    [126 * 1024 * 1024, "126 MB"],
    [2 * 1024 ** 4, "2048 GB"],
  ])("formats %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
