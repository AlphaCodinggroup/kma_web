import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  resetMutation: vi.fn(),
  mutationOptions: {} as any,
  mutationState: {} as any,
  pollArgs: {} as any,
  pollState: {} as any,
}));

vi.mock("./useSendForReview", () => ({
  useSendForReviewMutation: (options: any) => {
    mocks.mutationOptions = options;
    return {
      mutate: mocks.mutate,
      reset: mocks.resetMutation,
      isPending: false,
      error: null,
      data: undefined,
      ...mocks.mutationState,
    };
  },
}));
vi.mock("./usePoollAuditReview", () => ({
  usePollAuditReview: (args: any) => {
    mocks.pollArgs = args;
    return { data: undefined, isFetching: false, error: null, ...mocks.pollState };
  },
}));

import { useSendForReviewAudit } from "./useSendForReviewAudit";

describe("useSendForReviewAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationState = {};
    mocks.pollState = {};
  });

  it("starts, polls and notifies readiness exactly once", async () => {
    const onReady = vi.fn();
    mocks.mutationState = { isPending: true };
    const { result, rerender } = renderHook(() =>
      useSendForReviewAudit({ refetchIntervalMs: 2000, stopWhenReady: true, onReady })
    );
    expect(result.current.uiMessage).toBe("Sending for review…");
    expect(mocks.pollArgs).toMatchObject({ enabled: false, refetchIntervalMs: 2000, stopWhenReady: true });

    act(() => result.current.start("audit-1"));
    expect(mocks.resetMutation).toHaveBeenCalledOnce();
    expect(mocks.mutate).toHaveBeenCalledWith({ auditId: "audit-1" });

    act(() => mocks.mutationOptions.onSuccess({ auditReviewId: "review-1" }));
    mocks.mutationState = { isPending: false, data: { auditReviewId: "review-1" } };
    rerender();
    expect(result.current.auditReviewId).toBe("review-1");
    expect(result.current.uiMessage).toBe("Generating draft report…");
    expect(mocks.pollArgs).toMatchObject({ auditReviewId: "review-1", enabled: true });

    const progress = { auditReviewId: "review-1", status: "pending", reviewReady: true };
    mocks.pollState = { data: progress, isFetching: false };
    rerender();
    await waitFor(() => expect(onReady).toHaveBeenCalledWith(progress));
    expect(result.current.isReady).toBe(true);
    expect(result.current.reviewReady).toBe(true);
    expect(result.current.uiMessage).toBe("Sent for review. Waiting for QC.");
    rerender();
    expect(onReady).toHaveBeenCalledOnce();

    act(() => result.current.reset());
    expect(result.current.auditReviewId).toBeUndefined();
    expect(mocks.resetMutation).toHaveBeenCalledTimes(2);
  });

  it("recognizes the canonical ready status and exposes dependency errors", () => {
    const sendError = { code: "CONFLICT", message: "already sent" };
    const pollError = { code: "NETWORK", message: "offline" };
    mocks.mutationState = { error: sendError, data: { auditReviewId: "old" } };
    mocks.pollState = {
      data: { status: "draft_report_pending_review", reviewReady: false },
      isFetching: true,
      error: pollError,
    };
    const { result } = renderHook(() => useSendForReviewAudit());
    expect(result.current.isReady).toBe(true);
    expect(result.current.reviewReady).toBe(false);
    expect(result.current.isPolling).toBe(true);
    expect(result.current.sendError).toBe(sendError);
    expect(result.current.pollError).toBe(pollError);
    expect(result.current.sendResult).toEqual({ auditReviewId: "old" });
  });
});
