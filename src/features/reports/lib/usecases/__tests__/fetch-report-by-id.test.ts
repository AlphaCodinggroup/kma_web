// ---------------------------------------------------------------------------
// Tests for the fetchReportById use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReportsRepo } from "@entities/report/api/reports.repo";
import type { ReportListItem } from "@entities/report/model/report-list";
import { fetchReportById } from "../fetch-report-by-id";

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

function makeRepo(getById = vi.fn()): ReportsRepo {
  return { list: vi.fn(), getById, delete: vi.fn() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchReportById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty string", ""],
    ["undefined", undefined as unknown as string],
    ["null", null as unknown as string],
  ])("throws when the id is %s", async (_label, id) => {
    const repo = makeRepo();

    await expect(fetchReportById(repo, id)).rejects.toThrow(
      "Report id is required"
    );
    expect(repo.getById).not.toHaveBeenCalled();
  });

  it("returns the report coming from the repository", async () => {
    const item = makeItem();
    const repo = makeRepo(vi.fn().mockResolvedValue(item));

    await expect(fetchReportById(repo, "audit-1")).resolves.toBe(item);
    expect(repo.getById).toHaveBeenCalledWith("audit-1");
  });

  it("returns a report still being generated", async () => {
    const item = makeItem({
      status: "draft_report_pending_review",
      reportUrl: null,
      completedAt: null,
    });
    const repo = makeRepo(vi.fn().mockResolvedValue(item));

    await expect(fetchReportById(repo, "audit-1")).resolves.toMatchObject({
      reportUrl: null,
    });
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("not found")));

    await expect(fetchReportById(repo, "audit-1")).rejects.toThrow("not found");
  });
});
