// ---------------------------------------------------------------------------
// Tests for the useReportByIdQuery hook and its options factory
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReportListItem } from "@entities/report/model/report-list";

const getByIdMock = vi.fn();

vi.mock("@features/reports/api/reports.repo.impl", () => {
  const repo = {
    list: vi.fn(),
    getById: (...args: unknown[]) => getByIdMock(...args),
    delete: vi.fn(),
  };
  return { reportsRepo: repo, default: repo, ReportsRepoHttp: class {} };
});

import {
  useReportByIdQuery,
  reportByIdQueryKey,
  createReportByIdQueryOptions,
} from "../useReportByIdQuery";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reportByIdQueryKey", () => {
  it("builds a stable cache key", () => {
    expect(reportByIdQueryKey("audit-1")).toEqual(["report-download", "audit-1"]);
  });
});

describe("createReportByIdQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns options whose queryFn hits the repository", async () => {
    const item = makeItem();
    getByIdMock.mockResolvedValue(item);

    const options = createReportByIdQueryOptions("audit-1");

    expect(options.queryKey).toEqual(["report-download", "audit-1"]);
    await expect(
      (options.queryFn as () => Promise<ReportListItem>)()
    ).resolves.toBe(item);
    expect(getByIdMock).toHaveBeenCalledWith("audit-1");
  });
});

describe("useReportByIdQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the report", async () => {
    const item = makeItem();
    getByIdMock.mockResolvedValue(item);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(() => useReportByIdQuery({ id: "audit-1" }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(item);
    expect(getByIdMock).toHaveBeenCalledWith("audit-1");
    expect(client.getQueryData(reportByIdQueryKey("audit-1"))).toEqual(item);
  });

  it("returns a report that is still being generated", async () => {
    getByIdMock.mockResolvedValue(
      makeItem({
        status: "draft_report_pending_review",
        reportUrl: null,
        completedAt: null,
      })
    );
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReportByIdQuery({ id: "audit-1" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.reportUrl).toBeNull();
  });

  it.each([
    ["there is no id", {}],
    ["enabled is false", { id: "audit-1", enabled: false }],
  ])("stays disabled when %s", (_label, params) => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReportByIdQuery(params), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("uses a pending cache key while there is no id", () => {
    const { client, wrapper } = createWrapper();

    renderHook(() => useReportByIdQuery({}), { wrapper });

    const cached = client
      .getQueryCache()
      .find({ queryKey: reportByIdQueryKey("pending") });

    expect(cached).toBeDefined();
  });

  it("guards the queryFn against a missing id", () => {
    const { client, wrapper } = createWrapper();

    renderHook(() => useReportByIdQuery({}), { wrapper });

    const cached = client
      .getQueryCache()
      .find({ queryKey: reportByIdQueryKey("pending") });
    const queryFn = cached?.options.queryFn as () => Promise<unknown>;

    // La query queda deshabilitada sin id, así que esta guarda es defensiva:
    // se invoca directamente para dejar documentado su contrato.
    expect(() => queryFn()).toThrow("Report id is required");
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  it("exposes the repository error", async () => {
    getByIdMock.mockRejectedValue({ code: "NOT_FOUND", message: "gone" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useReportByIdQuery({ id: "audit-1" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "NOT_FOUND" });
  });
});
