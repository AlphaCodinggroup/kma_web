// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de Reports.
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

import { ReportsRepoHttp, reportsRepo } from "../reports.repo.impl";
import {
  mapReportsListFromDTO,
  mapReportListItemFromDTO,
  type ReportsListResponseDTO,
  type ReportListItemDTO,
} from "@entities/report/lib/report-list.mappers";

const itemDTO: ReportListItemDTO = {
  id: "audit-1",
  flow_id: "flow-1",
  user_id: "user-1",
  status: "completed",
  report_name: "Report One",
  report_url: "https://cdn.example.com/report-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  completed_at: "2026-01-02T00:00:00Z",
};

const listDTO: ReportsListResponseDTO = {
  reports: [itemDTO],
  count: 1,
  last_eval_id: "cursor-1",
  has_more: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe("ReportsRepoHttp.list", () => {
  it("maps every domain filter into its snake_case query param", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await new ReportsRepoHttp().list({
      userId: "user-1",
      status: "completed",
      limit: 25,
      lastEvalId: "cursor-1",
    });

    expect(http.get).toHaveBeenCalledWith("/api/reports", {
      params: {
        user_id: "user-1",
        status: "completed",
        limit: 25,
        last_eval_id: "cursor-1",
      },
    });
  });

  it.each([
    ["no filter", undefined],
    ["an empty filter", {}],
    ["a partial filter", { limit: 10 }],
  ])("leaves the missing params undefined with %s", async (_label, filter) => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await new ReportsRepoHttp().list(filter);

    const [, config] = http.get.mock.calls[0] as [
      string,
      { params: Record<string, unknown> },
    ];
    const expectedLimit = (filter as { limit?: number } | undefined)?.limit;
    expect(config.params).toEqual({
      user_id: undefined,
      status: undefined,
      limit: expectedLimit,
      last_eval_id: undefined,
    });
  });

  it("maps the response into a domain page", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    const page = await new ReportsRepoHttp().list();

    expect(page).toEqual(mapReportsListFromDTO(listDTO));
    expect(page.count).toBe(1);
    expect(page.hasMore).toBe(true);
    expect(page.lastEvalId).toBe("cursor-1");
    expect(page.items[0]?.reportName).toBe("Report One");
  });
});

// ---------------------------------------------------------------------------
// getById / delete
// ---------------------------------------------------------------------------

describe("ReportsRepoHttp.getById", () => {
  it.each([
    ["audit-1", "/api/reports/audit-1"],
    ["audit/1", "/api/reports/audit%2F1"],
    ["a b#c", "/api/reports/a%20b%23c"],
  ])("encodes the id %s into %s", async (id, expectedUrl) => {
    http.get.mockResolvedValueOnce({ data: itemDTO });

    await new ReportsRepoHttp().getById(id);

    expect(http.get).toHaveBeenCalledWith(expectedUrl);
  });

  it("maps the DTO into a domain item", async () => {
    http.get.mockResolvedValueOnce({ data: itemDTO });

    const item = await new ReportsRepoHttp().getById("audit-1");

    expect(item).toEqual(mapReportListItemFromDTO(itemDTO));
    expect(item.reportUrl).toBe("https://cdn.example.com/report-1.pdf");
  });

  // El estado del reporte es el de la auditoría (la lambda `reports` devuelve
  // audit.Status), así que "generándose" se señaliza con report_url en null y
  // no con un estado propio.
  it("keeps a still-generating report with a null url", async () => {
    http.get.mockResolvedValueOnce({
      data: {
        ...itemDTO,
        status: "final_report_sent_to_client",
        report_url: null,
      },
    });

    const item = await new ReportsRepoHttp().getById("audit-1");

    expect(item.status).toBe("final_report_sent_to_client");
    expect(item.reportUrl).toBeNull();
  });
});

describe("ReportsRepoHttp.delete", () => {
  it.each([
    ["audit-1", "/api/reports/audit-1"],
    ["audit/1", "/api/reports/audit%2F1"],
  ])("encodes the id %s into %s", async (id, expectedUrl) => {
    http.delete.mockResolvedValueOnce({ data: undefined });

    await new ReportsRepoHttp().delete(id);

    expect(http.delete).toHaveBeenCalledWith(expectedUrl);
  });
});

// ---------------------------------------------------------------------------
// Normalización de errores
// ---------------------------------------------------------------------------

describe("ReportsRepoHttp error normalisation", () => {
  const apiError = { code: "NOT_FOUND", message: "gone", details: null };

  it.each([
    ["list", "get" as const, () => new ReportsRepoHttp().list()],
    ["getById", "get" as const, () => new ReportsRepoHttp().getById("a")],
    ["delete", "delete" as const, () => new ReportsRepoHttp().delete("a")],
  ])("%s propagates an ApiError untouched", async (_label, verb, run) => {
    http[verb].mockRejectedValueOnce(apiError);
    await expect(run()).rejects.toEqual(apiError);
  });

  it.each([
    ["list", "get" as const, () => new ReportsRepoHttp().list()],
    ["getById", "get" as const, () => new ReportsRepoHttp().getById("a")],
    ["delete", "delete" as const, () => new ReportsRepoHttp().delete("a")],
  ])("%s wraps an unknown error", async (_label, verb, run) => {
    const raw = new Error("boom");
    http[verb].mockRejectedValueOnce(raw);

    await expect(run()).rejects.toEqual({
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error",
      details: raw,
    });
  });
});

describe("reportsRepo singleton", () => {
  it("uses the default base path", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await reportsRepo.list();

    expect(http.get).toHaveBeenCalledWith("/api/reports", expect.anything());
  });

  it("honours a custom base path on a fresh instance", async () => {
    http.get.mockResolvedValueOnce({ data: itemDTO });

    await new ReportsRepoHttp("/api/v2/reports").getById("a-1");

    expect(http.get).toHaveBeenCalledWith("/api/v2/reports/a-1");
  });
});
