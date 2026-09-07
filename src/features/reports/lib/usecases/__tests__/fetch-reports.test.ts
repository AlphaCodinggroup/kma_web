// ---------------------------------------------------------------------------
// Tests for the fetchReports use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReportsRepo } from "@entities/report/api/reports.repo";
import type {
  ReportListFilter,
  ReportListItem,
  ReportListPage,
} from "@entities/report/model/report-list";
import { fetchReports } from "../fetch-reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<ReportListItem> = {}): ReportListItem {
  return {
    id: "audit-1",
    flowId: "flow-1",
    userId: "user-1",
    reportName: "Report 1",
    status: "completed",
    reportUrl: "https://cdn.test/report.pdf",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    completedAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function makePage(overrides: Partial<ReportListPage> = {}): ReportListPage {
  return {
    items: [makeItem()],
    count: 1,
    lastEvalId: null,
    hasMore: false,
    ...overrides,
  };
}

function makeRepo(list = vi.fn()): ReportsRepo {
  return { list, getById: vi.fn(), delete: vi.fn() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<[string, ReportListFilter | undefined]>([
    ["no filters", undefined],
    ["a user filter", { userId: "user-1" }],
    ["a status filter", { status: "completed" }],
    ["pagination", { limit: 25, lastEvalId: "cursor-1" }],
  ])("forwards %s to the repository", async (_label, filters) => {
    const page = makePage();
    const repo = makeRepo(vi.fn().mockResolvedValue(page));

    await expect(fetchReports(repo, filters)).resolves.toBe(page);
    expect(repo.list).toHaveBeenCalledWith(filters);
  });

  it("returns an empty page untouched", async () => {
    const page = makePage({ items: [], count: 0 });
    const repo = makeRepo(vi.fn().mockResolvedValue(page));

    await expect(fetchReports(repo)).resolves.toEqual(page);
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("server down")));

    await expect(fetchReports(repo)).rejects.toThrow("server down");
  });
});
