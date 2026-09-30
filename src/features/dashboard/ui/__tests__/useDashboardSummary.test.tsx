// ---------------------------------------------------------------------------
// Tests for the useDashboardSummary query hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { DashboardSummary } from "@entities/dashboard/model/dashboard";
import type { ApiError } from "@shared/interceptors/error";

const getDashboardSummaryMock = vi.fn();

vi.mock("@features/dashboard/lib/usecases/get-dashboard-summary", () => ({
  getDashboardSummary: (...args: unknown[]) => getDashboardSummaryMock(...args),
}));

import { useDashboardSummary, dashboardSummaryKey } from "../useDashboardSummary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, wrapper };
}

function makeSummary(): DashboardSummary {
  return {
    metrics: {
      totalProjects: 4,
      totalFacilities: 9,
      totalFacilitiesUnassigned: 0,
      totalAuditsCompleted: 3,
      totalDraftReportsPendingReview: 1,
      totalDraftReportsInReview: 2,
      totalFinalReportsSentToClient: 0,
    },
    projectFacilitiesSummary: [
      {
        projectId: "p-1",
        projectName: "Plant A",
        facilitiesUnassigned: 0,
        facilitiesCompleted: 2,
      },
    ],
    recentActivity: [
      {
        auditId: "a-1",
        projectId: "p-1",
        projectName: "Plant A",
        facilityId: "f-1",
        facilityName: "Line 1",
        flowId: "fl-1",
        flowName: "Flow 1",
        auditorId: "u-1",
        auditorName: "Jane Doe",
        completedAt: "2026-01-02T10:30:00Z",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDashboardSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a stable query key", () => {
    expect(dashboardSummaryKey).toEqual(["dashboard", "summary"]);
  });

  it("starts loading and then resolves with the summary", async () => {
    const summary = makeSummary();
    getDashboardSummaryMock.mockResolvedValue(summary);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(dashboardSummaryKey)).toEqual(summary);
  });

  it("surfaces the ApiError when the use case rejects", async () => {
    const apiError: ApiError = { code: "SERVER_ERROR", message: "boom" };
    getDashboardSummaryMock.mockRejectedValue(apiError);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(apiError);
  });

  it("does not fetch while the query is disabled", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useDashboardSummary({ enabled: false }),
      { wrapper }
    );

    expect(getDashboardSummaryMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lets the caller override the default options", async () => {
    const summary = makeSummary();
    getDashboardSummaryMock.mockResolvedValue(summary);
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useDashboardSummary({ staleTime: 0, retry: 0 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });

  it("reuses the cached entry across hook instances", async () => {
    const summary = makeSummary();
    getDashboardSummaryMock.mockResolvedValue(summary);
    const { wrapper } = createWrapper();

    const first = renderHook(() => useDashboardSummary(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    const second = renderHook(() => useDashboardSummary(), { wrapper });

    expect(second.result.current.data).toEqual(summary);
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);
  });
});
