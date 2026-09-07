// ---------------------------------------------------------------------------
// Tests for the audit report mapper (DTO -> domain)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { mapAuditReportDTO, type AuditReportDTO } from "../audit-report.mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** DTO minimo del report con los campos obligatorios. */
function makeReportDTO(
  overrides: Partial<AuditReportDTO> = {}
): AuditReportDTO {
  return {
    id: "report-1",
    status: "completed",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapAuditReportDTO
// ---------------------------------------------------------------------------

describe("mapAuditReportDTO", () => {
  it("maps every snake_case field to camelCase", () => {
    expect(
      mapAuditReportDTO(
        makeReportDTO({
          flow_id: "flow-1",
          user_id: "user-1",
          report_name: "Ramps report",
          report_url: "https://cdn/report.pdf",
          updated_at: "2026-01-02T00:00:00Z",
          completed_at: "2026-01-03T00:00:00Z",
        })
      )
    ).toEqual({
      id: "report-1",
      flowId: "flow-1",
      userId: "user-1",
      status: "completed",
      reportName: "Ramps report",
      reportUrl: "https://cdn/report.pdf",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      completedAt: "2026-01-03T00:00:00Z",
    });
  });

  it("maps absent optional fields to null", () => {
    const result = mapAuditReportDTO(makeReportDTO());

    expect(result.flowId).toBeNull();
    expect(result.userId).toBeNull();
    expect(result.reportName).toBeNull();
    expect(result.reportUrl).toBeNull();
    expect(result.updatedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it("maps null optional fields to null", () => {
    const result = mapAuditReportDTO(
      makeReportDTO({
        flow_id: null,
        user_id: null,
        report_name: null,
        report_url: null,
        updated_at: null,
        completed_at: null,
      })
    );

    expect(result.flowId).toBeNull();
    expect(result.userId).toBeNull();
    expect(result.reportName).toBeNull();
    expect(result.reportUrl).toBeNull();
    expect(result.updatedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it("normalizes blank strings to null", () => {
    const result = mapAuditReportDTO(
      makeReportDTO({
        flow_id: "   ",
        user_id: "",
        report_name: " \t ",
        report_url: "  ",
      })
    );

    expect(result.flowId).toBeNull();
    expect(result.userId).toBeNull();
    expect(result.reportName).toBeNull();
    expect(result.reportUrl).toBeNull();
  });

  it("trims the string fields that go through toNullIfEmpty", () => {
    const result = mapAuditReportDTO(
      makeReportDTO({ report_name: "  Ramps  ", report_url: "  /a.pdf  " })
    );

    expect(result.reportName).toBe("Ramps");
    expect(result.reportUrl).toBe("/a.pdf");
  });

  it("does not trim or normalize the date fields", () => {
    const result = mapAuditReportDTO(
      makeReportDTO({
        created_at: "  2026-01-01T00:00:00Z  ",
        updated_at: "   ",
        completed_at: "not-a-date",
      })
    );

    // FIXME: las fechas no pasan por toNullIfEmpty ni por validacion: un
    // updated_at en blanco queda como "   " y una fecha invalida se propaga,
    // a diferencia del resto de los strings del mismo DTO.
    expect(result.createdAt).toBe("  2026-01-01T00:00:00Z  ");
    expect(result.updatedAt).toBe("   ");
    expect(result.completedAt).toBe("not-a-date");
  });

  it("casts an unknown status without validating it", () => {
    // FIXME: `toStatus` es solo un cast; cualquier string entra como AuditStatus.
    expect(mapAuditReportDTO(makeReportDTO({ status: "processing" })).status).toBe(
      "processing"
    );
  });
});
