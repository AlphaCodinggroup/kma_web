// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de Dashboard.
// Se mockea httpClient para aislar la construcción de la request y el mapeo.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

const { http } = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@shared/api/http.client", () => ({ httpClient: http, default: http }));

import { DashboardRepoHttp, dashboardRepoImpl } from "../dashboard.repo.impl";
import {
  mapDashboardSummaryDTO,
  type DashboardSummaryDTO,
} from "@entities/dashboard/lib/mappers";

const summaryDTO: DashboardSummaryDTO = {
  metrics: {
    total_projects: 4,
    total_facilities: 12,
    total_facilities_unassigned: 3,
    total_audits_completed: 7,
    total_draft_reports_pending_review: 2,
    total_draft_reports_in_review: 1,
    total_final_reports_sent_to_client: 5,
  },
  project_facilities_summary: [
    {
      project_id: "p-1",
      project_name: "Project One",
      facilities_unassigned: 1,
      facilities_completed: 2,
    },
  ],
  recent_activity: [
    {
      audit_id: "a-1",
      project_id: "p-1",
      project_name: "Project One",
      facility_id: "f-1",
      facility_name: "Facility One",
      flow_id: "fl-1",
      flow_name: "Ramps",
      auditor_id: "u-1",
      auditor_name: "Ada",
      completed_at: "2026-01-15T10:30:00Z",
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("DashboardRepoHttp.getSummary", () => {
  it("calls GET on the default base path", async () => {
    http.get.mockResolvedValueOnce({ data: summaryDTO });

    await new DashboardRepoHttp().getSummary();

    expect(http.get).toHaveBeenCalledOnce();
    expect(http.get).toHaveBeenCalledWith("/api/dashboard");
  });

  it("honours a custom base path", async () => {
    http.get.mockResolvedValueOnce({ data: summaryDTO });

    await new DashboardRepoHttp("/api/v2/dashboard").getSummary();

    expect(http.get).toHaveBeenCalledWith("/api/v2/dashboard");
  });

  it("maps the DTO into the domain summary", async () => {
    http.get.mockResolvedValueOnce({ data: summaryDTO });

    const result = await new DashboardRepoHttp().getSummary();

    expect(result).toEqual(mapDashboardSummaryDTO(summaryDTO));
    expect(result.metrics.totalProjects).toBe(4);
    expect(result.projectFacilitiesSummary[0]?.projectName).toBe("Project One");
    expect(result.recentActivity[0]?.auditorName).toBe("Ada");
  });

  it("maps an empty payload into safe defaults", async () => {
    http.get.mockResolvedValueOnce({ data: {} });

    const result = await new DashboardRepoHttp().getSummary();

    expect(result.metrics.totalProjects).toBe(0);
    expect(result.projectFacilitiesSummary).toEqual([]);
    expect(result.recentActivity).toEqual([]);
  });

  // Tabla de errores: los ApiError se propagan tal cual y el resto se envuelve.
  it.each([
    [
      "an ApiError",
      { code: "SERVER_ERROR", message: "boom", details: { status: 500 } },
      { code: "SERVER_ERROR", message: "boom", details: { status: 500 } },
    ],
    [
      "an ApiError without details",
      { code: "NOT_FOUND", message: "missing" },
      { code: "NOT_FOUND", message: "missing", details: undefined },
    ],
  ])("propagates %s untouched", async (_label, thrown, expected) => {
    http.get.mockRejectedValueOnce(thrown);

    await expect(new DashboardRepoHttp().getSummary()).rejects.toEqual(
      expected
    );
  });

  it.each([
    ["a plain Error", new Error("network down")],
    ["a string", "oops"],
    ["null", null],
  ])("wraps %s into UNEXPECTED_ERROR", async (_label, thrown) => {
    http.get.mockRejectedValueOnce(thrown);

    await expect(new DashboardRepoHttp().getSummary()).rejects.toEqual({
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error",
      details: thrown,
    });
  });
});

describe("dashboardRepoImpl", () => {
  it("is a ready-to-use instance bound to /api/dashboard", async () => {
    http.get.mockResolvedValueOnce({ data: summaryDTO });

    await dashboardRepoImpl.getSummary();

    expect(http.get).toHaveBeenCalledWith("/api/dashboard");
  });
});
