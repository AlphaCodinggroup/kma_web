// ---------------------------------------------------------------------------
// Tests for the useAuditReviewDetail query hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditReviewDetail } from "@entities/audit/model/audit-review";

const getReviewDetailMock = vi.fn();

vi.mock("@features/audits/api/audit-review.repo.impl", () => ({
  auditReviewDetailRepo: {
    getReviewDetail: (...args: unknown[]) => getReviewDetailMock(...args),
    completeReview: vi.fn(),
    updateStatus: vi.fn(),
    updateFinding: vi.fn(),
  },
}));

import {
  useAuditReviewDetail,
  auditReviewDetailKey,
} from "../useAuditReviewDetail";

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

function makeDetail(
  overrides: Partial<AuditReviewDetail> = {}
): AuditReviewDetail {
  return {
    auditId: "audit-1",
    flowId: "flow-1",
    projectId: "project-1",
    status: "draft_report_in_review",
    findings: [],
    totalCost: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("auditReviewDetailKey", () => {
  it("builds a stable cache key", () => {
    expect(auditReviewDetailKey("audit-1")).toEqual([
      "audits",
      "review-detail",
      "audit-1",
    ]);
  });
});

describe("useAuditReviewDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the review detail", async () => {
    const detail = makeDetail();
    getReviewDetailMock.mockResolvedValue(detail);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditReviewDetail("audit-1", { retry: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(detail);
    expect(getReviewDetailMock).toHaveBeenCalledWith("audit-1");
    expect(client.getQueryData(auditReviewDetailKey("audit-1"))).toEqual(detail);
  });

  it("exposes the repository error", async () => {
    getReviewDetailMock.mockRejectedValue({
      code: "NOT_FOUND",
      message: "missing",
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditReviewDetail("audit-1", { retry: false }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([
    ["there is no audit id", undefined],
    ["the audit id is empty", ""],
  ])("stays disabled when %s", (_label, auditId) => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuditReviewDetail(auditId), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getReviewDetailMock).not.toHaveBeenCalled();
  });
});
