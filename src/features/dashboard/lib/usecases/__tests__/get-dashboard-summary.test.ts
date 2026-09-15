// ---------------------------------------------------------------------------
// Tests for the getDashboardSummary use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DashboardSummary } from "@entities/dashboard/model/dashboard";

const defaultGetSummary = vi.fn();

vi.mock("@features/dashboard/api/dashboard.repo.impl", () => ({
  dashboardRepoImpl: {
    getSummary: (...args: unknown[]) => defaultGetSummary(...args),
  },
}));

import { getDashboardSummary } from "../get-dashboard-summary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    metrics: {
      totalProjects: 3,
      totalFacilities: 8,
      totalFacilitiesUnassigned: 1,
      totalAuditsCompleted: 12,
      totalDraftReportsPendingReview: 2,
      totalDraftReportsInReview: 1,
      totalFinalReportsSentToClient: 5,
    },
    projectFacilitiesSummary: [],
    recentActivity: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getDashboardSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the summary coming from the injected repository", async () => {
    const summary = makeSummary();
    const repo = { getSummary: vi.fn().mockResolvedValue(summary) };

    await expect(getDashboardSummary(repo)).resolves.toBe(summary);
    expect(repo.getSummary).toHaveBeenCalledTimes(1);
  });

  it("propagates the repository error", async () => {
    const repo = { getSummary: vi.fn().mockRejectedValue(new Error("boom")) };

    await expect(getDashboardSummary(repo)).rejects.toThrow("boom");
  });

  it("falls back to the default repository when none is given", async () => {
    const summary = makeSummary();
    defaultGetSummary.mockResolvedValue(summary);

    await expect(getDashboardSummary()).resolves.toBe(summary);
    expect(defaultGetSummary).toHaveBeenCalledTimes(1);
  });
});
