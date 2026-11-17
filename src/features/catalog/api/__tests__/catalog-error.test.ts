import { describe, expect, it } from "vitest";
import type { AxiosError } from "axios";
import { createApiErrorFromAxios } from "@shared/interceptors/error";
import { normalizeCatalogError } from "../catalog-error";

describe("Catalog error boundary", () => {
  it("extracts a nested backend row message from the real shared Axios normalizer", () => {
    const shared = createApiErrorFromAxios({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Row 8, column cost: expected a number",
          },
        },
      },
    } as AxiosError);
    expect(normalizeCatalogError(shared)).toEqual({
      ...shared,
      message: "Row 8, column cost: expected a number",
    });
  });
  it("extracts nested response messages without replacing conflict identity or metadata", () => {
    const shared = {
      code: "CONFLICT",
      message: "Conflict",
      details: {
        status: 409,
        response: {
          error: {
            code: "REVISION_CHANGED",
            message: "The catalog revision changed",
          },
        },
      },
    };
    expect(normalizeCatalogError(shared)).toEqual({
      ...shared,
      message: "The catalog revision changed",
    });
  });
  it.each([
    null,
    [],
    { error: "error" },
    { error: { message: 42 } },
    { error: { message: " " } },
  ])("keeps the normalized fallback for an unknown envelope %j", (raw) => {
    const error = {
      code: "BAD_REQUEST",
      message: "Fallback",
      details: { raw },
    };
    expect(normalizeCatalogError(error)).toEqual(error);
  });
  it("preserves native error messages", () => {
    expect(normalizeCatalogError(new Error("File reader failed")).message).toBe(
      "File reader failed",
    );
  });
  it("falls back to the response envelope when raw metadata has no actionable message", () => {
    const shared = {
      code: "BAD_REQUEST",
      message: "Fallback",
      details: {
        raw: { error: { message: 42 } },
        response: { error: { message: "Row 12: missing flow code" } },
      },
    };
    expect(normalizeCatalogError(shared).message).toBe(
      "Row 12: missing flow code",
    );
  });
});
