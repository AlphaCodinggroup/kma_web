// ---------------------------------------------------------------------------
// Tests for the useDeleteReport mutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const deleteMock = vi.fn();

vi.mock("@features/reports/api/reports.repo.impl", () => {
  const repo = {
    list: vi.fn(),
    delete: (...args: unknown[]) => deleteMock(...args),
  };
  return { reportsRepo: repo, default: repo, ReportsRepoHttp: class {} };
});

import { useDeleteReport } from "../useDeleteReport";

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
  const invalidateQueries = vi.spyOn(client, "invalidateQueries");

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, wrapper, invalidateQueries };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDeleteReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is idle before the first call", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteReport(), { wrapper });

    expect(result.current.isIdle).toBe(true);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the report and invalidates the reports list", async () => {
    deleteMock.mockResolvedValue(undefined);
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useDeleteReport(), { wrapper });

    result.current.mutate("audit-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteMock).toHaveBeenCalledWith("audit-1");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["reports", "list"],
    });
  });

  it("exposes the error and skips the invalidation", async () => {
    deleteMock.mockRejectedValue(new Error("forbidden"));
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useDeleteReport(), { wrapper });

    result.current.mutate("audit-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("forbidden");
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
