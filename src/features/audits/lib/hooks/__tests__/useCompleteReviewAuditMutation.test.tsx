// ---------------------------------------------------------------------------
// Tests for the useCompleteReviewAuditMutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";

const completeReviewAuditMock = vi.fn();

vi.mock("@features/audits/lib/usecases/completeReviewAudit", () => ({
  completeReviewAudit: (...args: unknown[]) => completeReviewAuditMock(...args),
}));

import { useCompleteReviewAuditMutation } from "../useCompleteReviewAuditMutation";

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

function makeResult(): CompleteReviewResult {
  return {
    auditId: "audit-1",
    status: "final_report_sent_to_client",
    message: "Review completed",
    requestId: "req-1",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCompleteReviewAuditMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes the review and returns the result", async () => {
    const expected = makeResult();
    completeReviewAuditMock.mockResolvedValue(expected);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCompleteReviewAuditMutation(), {
      wrapper,
    });

    result.current.mutate({ auditId: "audit-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(completeReviewAuditMock).toHaveBeenCalledWith("audit-1");
    expect(result.current.data).toEqual(expected);
  });

  it("invalidates both the audits list and the audit details", async () => {
    completeReviewAuditMock.mockResolvedValue(makeResult());
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useCompleteReviewAuditMutation(), {
      wrapper,
    });

    result.current.mutate({ auditId: "audit-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["audits", "list"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["audits", "detail"],
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it("exposes the error and skips the invalidation", async () => {
    completeReviewAuditMock.mockRejectedValue(new Error("still in review"));
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useCompleteReviewAuditMutation(), {
      wrapper,
    });

    result.current.mutate({ auditId: "audit-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("still in review");
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
