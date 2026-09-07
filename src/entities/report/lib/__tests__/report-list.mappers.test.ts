// ---------------------------------------------------------------------------
// Tests for the reports list mappers (GET /reports)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapReportListItemFromDTO,
  mapReportsListFromDTO,
  type ReportListItemDTO,
  type ReportsListResponseDTO,
} from "../report-list.mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Item minimo del listado de reports. */
function makeItemDTO(
  overrides: Partial<ReportListItemDTO> = {}
): ReportListItemDTO {
  return {
    id: "report-1",
    status: "completed",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Respuesta minima con un unico item. */
function makeResponseDTO(
  overrides: Partial<ReportsListResponseDTO> = {}
): ReportsListResponseDTO {
  return {
    reports: [makeItemDTO()],
    count: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapReportListItemFromDTO
// ---------------------------------------------------------------------------

describe("mapReportListItemFromDTO", () => {
  it("reuses the audit report mapper", () => {
    const result = mapReportListItemFromDTO(
      makeItemDTO({ report_name: "  Ramps  ", flow_id: "flow-1" })
    );

    expect(result.reportName).toBe("Ramps");
    expect(result.flowId).toBe("flow-1");
    expect(result.userId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapReportsListFromDTO
// ---------------------------------------------------------------------------

describe("mapReportsListFromDTO", () => {
  it("maps the full page envelope", () => {
    const result = mapReportsListFromDTO(
      makeResponseDTO({
        reports: [makeItemDTO({ id: "r-1" }), makeItemDTO({ id: "r-2" })],
        count: 2,
        last_eval_id: "cursor-1",
        has_more: true,
      })
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.id).toBe("r-1");
    expect(result.count).toBe(2);
    expect(result.lastEvalId).toBe("cursor-1");
    expect(result.hasMore).toBe(true);
  });

  it("returns an empty page for an empty report list", () => {
    expect(
      mapReportsListFromDTO({ reports: [], count: 0 })
    ).toEqual({
      items: [],
      count: 0,
      lastEvalId: null,
      hasMore: false,
    });
  });

  it("keeps a count of 0 instead of falling back to the array length", () => {
    const result = mapReportsListFromDTO(
      makeResponseDTO({ reports: [makeItemDTO(), makeItemDTO()], count: 0 })
    );

    expect(result.count).toBe(0);
  });

  it("falls back to the array length when count is NaN", () => {
    const result = mapReportsListFromDTO(
      makeResponseDTO({
        reports: [makeItemDTO(), makeItemDTO(), makeItemDTO()],
        count: Number.NaN,
      })
    );

    expect(result.count).toBe(3);
  });

  // El backend puede mandar el count como string: descartarlo hacía que la
  // interfaz mostrara el tamaño de la página en vez del total.
  it("accepts a numeric count sent as a string", () => {
    const result = mapReportsListFromDTO(
      makeResponseDTO({
        reports: [makeItemDTO()],
        count: "5" as never,
      })
    );

    expect(result.count).toBe(5);
  });

  it("falls back to the array length when the count is not usable", () => {
    const result = mapReportsListFromDTO(
      makeResponseDTO({
        reports: [makeItemDTO(), makeItemDTO()],
        count: "muchos" as never,
      })
    );

    expect(result.count).toBe(2);
  });

  it.each([
    ["absent", undefined, null],
    ["null", null, null],
    ["a value", "eval-1", "eval-1"],
  ])("maps last_eval_id %s to %s", (_label, value, expected) => {
    const response: ReportsListResponseDTO = { reports: [], count: 0 };
    if (value !== undefined) {
      response.last_eval_id = value;
    }

    expect(mapReportsListFromDTO(response).lastEvalId).toBe(expected);
  });

  it.each([
    ["absent", undefined, false],
    ["true", true, true],
    ["false", false, false],
  ])("coerces has_more %s to %s", (_label, value, expected) => {
    const response: ReportsListResponseDTO = { reports: [], count: 0 };
    if (value !== undefined) {
      response.has_more = value;
    }

    expect(mapReportsListFromDTO(response).hasMore).toBe(expected);
  });

  // Una respuesta malformada degrada a una página vacía en vez de romper.
  it.each([
    ["the reports key is missing", { count: 0 }],
    ["the response is null", null],
    ["reports is not an array", { reports: "nope" }],
  ])("returns an empty page when %s", (_label, response) => {
    const result = mapReportsListFromDTO(response as never);

    expect(result.items).toEqual([]);
    expect(result.count).toBe(0);
  });
});
