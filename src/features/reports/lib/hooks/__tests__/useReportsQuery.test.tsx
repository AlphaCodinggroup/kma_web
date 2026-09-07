// ---------------------------------------------------------------------------
// Tests for the useReportsListQuery hook and its options factory
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type {
  ReportListItem,
  ReportListPage,
} from "@entities/report/model/report-list";

const listMock = vi.fn();

vi.mock("@features/reports/api/reports.repo.impl", () => {
  const repo = {
    list: (...args: unknown[]) => listMock(...args),
    delete: vi.fn(),
  };
  return { reportsRepo: repo, default: repo, ReportsRepoHttp: class {} };
});

import {
  useReportsListQuery,
  reportsListQueryKey,
  createReportsListQueryOptions,
} from "../useReportsQuery";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reportsListQueryKey", () => {
  it.each([
    ["no filters", undefined, ["reports", {}]],
    [
      "a status filter",
      { status: "completed" as const },
      ["reports", { status: "completed" }],
    ],
  ])("builds a stable cache key for %s", (_label, filters, expected) => {
    expect(reportsListQueryKey(filters)).toEqual(expected);
  });
});

describe("createReportsListQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns options whose queryFn hits the repository", async () => {
    const page = makePage();
    listMock.mockResolvedValue(page);

    const options = createReportsListQueryOptions({ userId: "user-1" });

    expect(options.queryKey).toEqual(["reports", { userId: "user-1" }]);
    expect(options.staleTime).toBe(60_000);
    await expect(
      (options.queryFn as () => Promise<ReportListPage>)()
    ).resolves.toBe(page);
    expect(listMock).toHaveBeenCalledWith({ userId: "user-1" });
  });
});

describe("useReportsListQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the reports page", async () => {
    const page = makePage();
    listMock.mockResolvedValue(page);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(() => useReportsListQuery(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
    expect(client.getQueryData(reportsListQueryKey())).toEqual(page);
  });

  it("passes undefined to the use case when there are no filters", async () => {
    listMock.mockResolvedValue(makePage());
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReportsListQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMock).toHaveBeenCalledWith(undefined);
  });

  it("strips the enabled flag from the filters", async () => {
    listMock.mockResolvedValue(makePage());
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useReportsListQuery({ status: "completed", limit: 5, enabled: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMock).toHaveBeenCalledWith({ status: "completed", limit: 5 });
  });

  it("stays disabled when enabled is false", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useReportsListQuery({ enabled: false }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(listMock).not.toHaveBeenCalled();
  });

  it("exposes the repository error", async () => {
    listMock.mockRejectedValue({ code: "SERVER_ERROR", message: "boom" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReportsListQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "SERVER_ERROR" });
  });
});
