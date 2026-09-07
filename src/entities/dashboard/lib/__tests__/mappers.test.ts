// ---------------------------------------------------------------------------
// Tests for the dashboard summary mappers (DTO -> domain)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapProjectFacilitySummaryDTO,
  mapRecentActivityDTO,
  mapDashboardSummaryDTO,
  type DashboardSummaryDTO,
} from "../mappers";

// ---------------------------------------------------------------------------
// mapDashboardSummaryDTO — metrics
// ---------------------------------------------------------------------------

describe("mapDashboardSummaryDTO — metrics", () => {
  it("maps every snake_case metric to camelCase", () => {
    const dto: DashboardSummaryDTO = {
      metrics: {
        total_projects: 5,
        total_facilities: 12,
        total_facilities_unassigned: 3,
        total_audits_completed: 8,
        total_draft_reports_pending_review: 2,
        total_draft_reports_in_review: 1,
        total_final_reports_sent_to_client: 4,
      },
    };

    expect(mapDashboardSummaryDTO(dto).metrics).toEqual({
      totalProjects: 5,
      totalFacilities: 12,
      totalFacilitiesUnassigned: 3,
      totalAuditsCompleted: 8,
      totalDraftReportsPendingReview: 2,
      totalDraftReportsInReview: 1,
      totalFinalReportsSentToClient: 4,
    });
  });

  it("keeps metrics at 0 instead of confusing them with absent values", () => {
    const result = mapDashboardSummaryDTO({
      metrics: { total_projects: 0, total_facilities: 0 },
    });

    expect(result.metrics.totalProjects).toBe(0);
    expect(result.metrics.totalFacilities).toBe(0);
  });

  it.each([
    ["null metrics", null],
    ["undefined metrics", undefined],
    ["empty metrics object", {}],
  ])("defaults every metric to 0 for %s", (_label, metrics) => {
    const dto: DashboardSummaryDTO = {};
    if (metrics !== undefined) {
      dto.metrics = metrics;
    }

    expect(mapDashboardSummaryDTO(dto).metrics).toEqual({
      totalProjects: 0,
      totalFacilities: 0,
      totalFacilitiesUnassigned: 0,
      totalAuditsCompleted: 0,
      totalDraftReportsPendingReview: 0,
      totalDraftReportsInReview: 0,
      totalFinalReportsSentToClient: 0,
    });
  });

  it("parses metrics arriving as numeric strings", () => {
    const result = mapDashboardSummaryDTO({
      metrics: { total_projects: "42" as never },
    });

    expect(result.metrics.totalProjects).toBe(42);
  });

  it("falls back to 0 for an unparseable metric", () => {
    const result = mapDashboardSummaryDTO({
      metrics: { total_projects: "many" as never },
    });

    expect(result.metrics.totalProjects).toBe(0);
  });

  it("turns a null metric into 0 through Number(null)", () => {
    const result = mapDashboardSummaryDTO({
      metrics: { total_projects: null },
    });

    expect(result.metrics.totalProjects).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mapProjectFacilitySummaryDTO
// ---------------------------------------------------------------------------

describe("mapProjectFacilitySummaryDTO", () => {
  it("maps every snake_case field to camelCase", () => {
    expect(
      mapProjectFacilitySummaryDTO({
        project_id: "p-1",
        project_name: "Project One",
        facilities_unassigned: 2,
        facilities_completed: 7,
      })
    ).toEqual({
      projectId: "p-1",
      projectName: "Project One",
      facilitiesUnassigned: 2,
      facilitiesCompleted: 7,
    });
  });

  it("defaults strings to empty and numbers to 0 when absent", () => {
    expect(mapProjectFacilitySummaryDTO({})).toEqual({
      projectId: "",
      projectName: "",
      facilitiesUnassigned: 0,
      facilitiesCompleted: 0,
    });
  });

  it("defaults strings to empty when explicitly null", () => {
    const result = mapProjectFacilitySummaryDTO({
      project_id: null,
      project_name: null,
    });

    expect(result.projectId).toBe("");
    expect(result.projectName).toBe("");
  });

  it("keeps facility counters at 0", () => {
    const result = mapProjectFacilitySummaryDTO({
      facilities_unassigned: 0,
      facilities_completed: 0,
    });

    expect(result.facilitiesUnassigned).toBe(0);
    expect(result.facilitiesCompleted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mapRecentActivityDTO
// ---------------------------------------------------------------------------

describe("mapRecentActivityDTO", () => {
  it("maps every snake_case field to camelCase", () => {
    expect(
      mapRecentActivityDTO({
        audit_id: "a-1",
        project_id: "p-1",
        project_name: "Project One",
        facility_id: "f-1",
        facility_name: "Facility One",
        flow_id: "fl-1",
        flow_name: "Ramps",
        auditor_id: "u-1",
        auditor_name: "Jane",
        completed_at: "2026-01-01T00:00:00Z",
      })
    ).toEqual({
      auditId: "a-1",
      projectId: "p-1",
      projectName: "Project One",
      facilityId: "f-1",
      facilityName: "Facility One",
      flowId: "fl-1",
      flowName: "Ramps",
      auditorId: "u-1",
      auditorName: "Jane",
      completedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("defaults every field to an empty string when absent", () => {
    expect(mapRecentActivityDTO({})).toEqual({
      auditId: "",
      projectId: "",
      projectName: "",
      facilityId: "",
      facilityName: "",
      flowId: "",
      flowName: "",
      auditorId: "",
      auditorName: "",
      completedAt: null,
    });
  });

  // completedAt es nullable: como cadena no se podía distinguir "sin
  // completar" de una fecha vacía.
  it.each([
    ["null", null],
    ["absent", undefined],
    ["an invalid date", "not-a-date"],
    ["blank", "   "],
  ])("maps a completed_at that is %s to null", (_label, completed_at) => {
    expect(
      mapRecentActivityDTO({ completed_at: completed_at as never }).completedAt
    ).toBeNull();
  });

  it("keeps a valid completed_at", () => {
    expect(
      mapRecentActivityDTO({ completed_at: "2026-01-15T10:30:00Z" }).completedAt
    ).toBe("2026-01-15T10:30:00Z");
  });

  // Un valor que no es cadena se descarta: String() lo convertía en texto y un
  // objeto terminaba en pantalla como "[object Object]".
  it("drops values that are not strings", () => {
    const result = mapRecentActivityDTO({
      audit_id: 42 as never,
      completed_at: 1767225600000 as never,
      project_name: {} as never,
    });

    expect(result.auditId).toBe("");
    expect(result.completedAt).toBeNull();
    expect(result.projectName).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapDashboardSummaryDTO — collections
// ---------------------------------------------------------------------------

describe("mapDashboardSummaryDTO — collections", () => {
  it("maps both collections", () => {
    const result = mapDashboardSummaryDTO({
      project_facilities_summary: [
        { project_id: "p-1", facilities_completed: 3 },
      ],
      recent_activity: [{ audit_id: "a-1" }, { audit_id: "a-2" }],
    });

    expect(result.projectFacilitiesSummary).toHaveLength(1);
    expect(result.projectFacilitiesSummary[0]?.facilitiesCompleted).toBe(3);
    expect(result.recentActivity).toHaveLength(2);
    expect(result.recentActivity[1]?.auditId).toBe("a-2");
  });

  it.each([
    ["an empty array", []],
    ["null", null],
    ["a non-array value", "nope"],
  ])("returns empty collections for %s", (_label, value) => {
    const result = mapDashboardSummaryDTO({
      project_facilities_summary: value as never,
      recent_activity: value as never,
    });

    expect(result.projectFacilitiesSummary).toEqual([]);
    expect(result.recentActivity).toEqual([]);
  });

  it("returns a fully defaulted summary for an empty DTO", () => {
    expect(mapDashboardSummaryDTO({})).toEqual({
      metrics: {
        totalProjects: 0,
        totalFacilities: 0,
        totalFacilitiesUnassigned: 0,
        totalAuditsCompleted: 0,
        totalDraftReportsPendingReview: 0,
        totalDraftReportsInReview: 0,
        totalFinalReportsSentToClient: 0,
      },
      projectFacilitiesSummary: [],
      recentActivity: [],
    });
  });
});
