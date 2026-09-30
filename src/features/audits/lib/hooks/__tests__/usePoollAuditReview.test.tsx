// ---------------------------------------------------------------------------
// Tests for the usePollAuditReview polling hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReviewProgress } from "@entities/audit/model/sendReview";

const pollReviewMock = vi.fn();

vi.mock("@features/audits/api/sendReview.repo.impl", () => ({
  auditReviewRepo: {
    sendForReview: vi.fn(),
    pollReview: (...args: unknown[]) => pollReviewMock(...args),
  },
}));

import { usePollAuditReview } from "../usePoollAuditReview";

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

function makeProgress(overrides: Partial<ReviewProgress> = {}): ReviewProgress {
  return {
    auditId: "audit-1",
    auditReviewId: "review-1",
    status: "draft_report_in_review",
    message: "Generating draft",
    reviewReady: false,
    ...overrides,
  };
}

/** Espera pasiva para comprobar que el polling se detuvo. */
function idle(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePollAuditReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays disabled when there is no review id", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePollAuditReview({}), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(pollReviewMock).not.toHaveBeenCalled();
  });

  it("stays disabled when enabled is false", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePollAuditReview({ auditReviewId: "review-1", enabled: false }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(pollReviewMock).not.toHaveBeenCalled();
  });

  it("fetches the progress and caches it under the review key", async () => {
    const progress = makeProgress({ reviewReady: true });
    pollReviewMock.mockResolvedValue(progress);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePollAuditReview({ auditReviewId: "review-1" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pollReviewMock).toHaveBeenCalledWith("review-1");
    expect(client.getQueryData(["audits", "review", "review-1"])).toEqual(
      progress
    );
  });

  it("exposes the repository error", async () => {
    pollReviewMock.mockRejectedValue({ code: "NOT_FOUND", message: "gone" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePollAuditReview({
          auditReviewId: "review-1",
          options: { retry: false },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });
    expect(result.current.error).toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps polling while the review is not ready", async () => {
    pollReviewMock.mockResolvedValue(makeProgress());
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePollAuditReview({
          auditReviewId: "review-1",
          refetchIntervalMs: 20,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(pollReviewMock.mock.calls.length).toBeGreaterThan(1)
    );
  });

  it.each<[string, Partial<ReviewProgress>]>([
    ["reviewReady is true", { reviewReady: true }],
    [
      "the status reached draft_report_pending_review",
      { status: "draft_report_pending_review" },
    ],
  ])("stops polling once %s", async (_label, overrides) => {
    pollReviewMock.mockResolvedValue(makeProgress(overrides));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePollAuditReview({
          auditReviewId: "review-1",
          refetchIntervalMs: 20,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await idle(150);

    expect(pollReviewMock).toHaveBeenCalledTimes(1);
  });

  it("keeps polling even when ready if stopWhenReady is false", async () => {
    pollReviewMock.mockResolvedValue(makeProgress({ reviewReady: true }));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePollAuditReview({
          auditReviewId: "review-1",
          refetchIntervalMs: 20,
          stopWhenReady: false,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(pollReviewMock.mock.calls.length).toBeGreaterThan(1)
    );
  });
});
