// ---------------------------------------------------------------------------
// Tests for the useDeleteAudit mutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const deleteAuditMock = vi.fn();

vi.mock("@features/audits/lib/usecases/deleteAudit", () => ({
  default: (...args: unknown[]) => deleteAuditMock(...args),
  deleteAudit: (...args: unknown[]) => deleteAuditMock(...args),
}));

import { useDeleteAudit } from "../useDeleteAudit";

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

describe("useDeleteAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the audit and invalidates the audits list", async () => {
    deleteAuditMock.mockResolvedValue(undefined);
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useDeleteAudit(), { wrapper });

    result.current.mutate("audit-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteAuditMock).toHaveBeenCalledWith("audit-1");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["audits", "list"],
    });
  });

  it("exposes the error and skips the invalidation", async () => {
    deleteAuditMock.mockRejectedValue(new Error("forbidden"));
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useDeleteAudit(), { wrapper });

    result.current.mutate("audit-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("forbidden");
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("is idle before the first call", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteAudit(), { wrapper });

    expect(result.current.isIdle).toBe(true);
    expect(deleteAuditMock).not.toHaveBeenCalled();
  });
});
