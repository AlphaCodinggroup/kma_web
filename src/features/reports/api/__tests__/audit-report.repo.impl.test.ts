// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de Audit Report (detalle de reporte por auditoría).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosInstance } from "axios";

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

import { createAuditReportRepo, auditReportRepo } from "../audit-report.repo.impl";
import {
  mapAuditReportDTO,
  type AuditReportDTO,
} from "@entities/report/lib/audit-report.mappers";

/** El módulo resuelve la base contra window.location.origin al importarse. */
const API_BASE = `${window.location.origin}/api`;

const reportDTO: AuditReportDTO = {
  id: "audit-1",
  flow_id: "flow-1",
  user_id: "user-1",
  status: "completed",
  report_name: "Final report",
  report_url: "https://cdn.example.com/r.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  completed_at: "2026-01-02T00:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createAuditReportRepo.getReport", () => {
  it.each([
    ["audit-1", `${API_BASE}/reports/audit-1`],
    ["audit/1", `${API_BASE}/reports/audit%2F1`],
    ["a b#c", `${API_BASE}/reports/a%20b%23c`],
  ])("builds an absolute same-origin URL for %s", async (id, expectedUrl) => {
    http.get.mockResolvedValueOnce({ data: reportDTO });

    await createAuditReportRepo().getReport(id);

    expect(http.get).toHaveBeenCalledOnce();
    expect(http.get).toHaveBeenCalledWith(expectedUrl);
  });

  it("maps the DTO into the domain report", async () => {
    http.get.mockResolvedValueOnce({ data: reportDTO });

    const report = await createAuditReportRepo().getReport("audit-1");

    expect(report).toEqual(mapAuditReportDTO(reportDTO));
    expect(report.reportName).toBe("Final report");
    expect(report.flowId).toBe("flow-1");
  });

  it("normalises empty strings to null through the mapper", async () => {
    http.get.mockResolvedValueOnce({
      data: { ...reportDTO, flow_id: "  ", report_url: "" },
    });

    const report = await createAuditReportRepo().getReport("audit-1");

    expect(report.flowId).toBeNull();
    expect(report.reportUrl).toBeNull();
  });

  it("uses the injected axios instance instead of the default client", async () => {
    const injected = { get: vi.fn().mockResolvedValue({ data: reportDTO }) };

    await createAuditReportRepo(injected as unknown as AxiosInstance).getReport(
      "audit-1"
    );

    expect(injected.get).toHaveBeenCalledOnce();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("propagates the transport error untouched", async () => {
    const err = { code: "NOT_FOUND", message: "gone" };
    http.get.mockRejectedValueOnce(err);

    await expect(
      createAuditReportRepo().getReport("audit-1")
    ).rejects.toEqual(err);
  });
});

describe("auditReportRepo singleton", () => {
  it("is wired to the default http client", async () => {
    http.get.mockResolvedValueOnce({ data: reportDTO });

    await auditReportRepo.getReport("audit-9");

    expect(http.get).toHaveBeenCalledWith(`${API_BASE}/reports/audit-9`);
  });
});
