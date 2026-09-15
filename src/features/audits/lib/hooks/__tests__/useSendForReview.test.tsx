// ---------------------------------------------------------------------------
// Tests for the useSendForReviewMutation hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { SendForReviewResult } from "@entities/audit/model/sendReview";

const sendForReviewMock = vi.fn();

vi.mock("@features/audits/lib/usecases/send-for-review", () => ({
  sendForReview: (...args: unknown[]) => sendForReviewMock(...args),
}));

import { useSendForReviewMutation } from "../useSendForReview";

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

function makeResult(): SendForReviewResult {
  return {
    auditId: "audit-1",
    auditReviewId: "review-1",
    status: "draft_report_in_review",
    message: "Sent",
    reviewReady: false,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSendForReviewMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is idle before the first call", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSendForReviewMutation(), { wrapper });

    expect(result.current.isIdle).toBe(true);
    expect(sendForReviewMock).not.toHaveBeenCalled();
  });

  it("sends the audit for review and returns the result", async () => {
    const expected = makeResult();
    sendForReviewMock.mockResolvedValue(expected);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSendForReviewMutation(), { wrapper });

    result.current.mutate({ auditId: "audit-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sendForReviewMock).toHaveBeenCalledWith("audit-1");
    expect(result.current.data).toEqual(expected);
  });

  it("runs the caller onSuccess callback", async () => {
    const expected = makeResult();
    sendForReviewMock.mockResolvedValue(expected);
    const onSuccess = vi.fn();
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useSendForReviewMutation({ onSuccess }),
      { wrapper }
    );

    result.current.mutate({ auditId: "audit-1" });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess.mock.calls[0]?.[0]).toEqual(expected);
  });

  it("exposes the use case error", async () => {
    sendForReviewMock.mockRejectedValue({
      code: "CONFLICT",
      message: "already sent",
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSendForReviewMutation(), { wrapper });

    result.current.mutate({ auditId: "audit-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "CONFLICT" });
  });
});
