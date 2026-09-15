// ---------------------------------------------------------------------------
// Tests for the useSendForReviewAudit orchestration hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReviewProgress } from "@entities/audit/model/sendReview";
import type { ApiError } from "@shared/interceptors/error";

// ---------------------------------------------------------------------------
// Dobles de los dos hooks que compone: así se controla cada estado sin
// depender de React Query ni del transporte HTTP.
// ---------------------------------------------------------------------------

type SendState = {
  isPending: boolean;
  error: ApiError | null;
  data: unknown;
};

type PollState = {
  data: ReviewProgress | undefined;
  isFetching: boolean;
  error: ApiError | null;
};

type MutationOptions = {
  onSuccess?: (result: { auditReviewId: string }) => void;
};

let sendState: SendState;
let pollState: PollState;
let capturedOptions: MutationOptions | undefined;
const mutateSendMock = vi.fn();
const resetMutationMock = vi.fn();
const pollArgsSpy = vi.fn();

vi.mock("../useSendForReview", () => ({
  useSendForReviewMutation: (options?: MutationOptions) => {
    capturedOptions = options;
    return {
      mutate: mutateSendMock,
      isPending: sendState.isPending,
      error: sendState.error,
      reset: resetMutationMock,
      data: sendState.data,
    };
  },
}));

vi.mock("../usePoollAuditReview", () => ({
  usePollAuditReview: (args: unknown) => {
    pollArgsSpy(args);
    return pollState;
  },
}));

import { useSendForReviewAudit } from "../useSendForReviewAudit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Último argumento con el que se llamó al hook de polling. */
function lastPollArgs() {
  return pollArgsSpy.mock.calls.at(-1)?.[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSendForReviewAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendState = { isPending: false, error: null, data: undefined };
    pollState = { data: undefined, isFetching: false, error: null };
    capturedOptions = undefined;
    mutateSendMock.mockImplementation(() => undefined);
  });

  it("starts idle with the polling disabled", () => {
    const { result } = renderHook(() => useSendForReviewAudit());

    expect(result.current.auditReviewId).toBeUndefined();
    expect(result.current.isReady).toBe(false);
    expect(result.current.reviewReady).toBe(false);
    expect(result.current.uiMessage).toBe("");
    expect(lastPollArgs()).toMatchObject({ enabled: false });
  });

  it("triggers the mutation and enables the polling on success", () => {
    mutateSendMock.mockImplementation(() => {
      capturedOptions?.onSuccess?.({ auditReviewId: "review-1" });
    });

    const { result } = renderHook(() => useSendForReviewAudit());

    act(() => result.current.start("audit-1"));

    expect(mutateSendMock).toHaveBeenCalledWith({ auditId: "audit-1" });
    expect(resetMutationMock).toHaveBeenCalledTimes(1);
    expect(result.current.auditReviewId).toBe("review-1");
    expect(lastPollArgs()).toMatchObject({
      auditReviewId: "review-1",
      enabled: true,
      refetchIntervalMs: 5000,
      stopWhenReady: true,
    });
  });

  it("forwards custom polling options", () => {
    renderHook(() =>
      useSendForReviewAudit({ refetchIntervalMs: 250, stopWhenReady: false })
    );

    expect(lastPollArgs()).toMatchObject({
      refetchIntervalMs: 250,
      stopWhenReady: false,
    });
  });

  it("clears the state on reset", () => {
    mutateSendMock.mockImplementation(() => {
      capturedOptions?.onSuccess?.({ auditReviewId: "review-1" });
    });

    const { result } = renderHook(() => useSendForReviewAudit());

    act(() => result.current.start("audit-1"));
    expect(result.current.auditReviewId).toBe("review-1");

    act(() => result.current.reset());

    expect(result.current.auditReviewId).toBeUndefined();
    expect(lastPollArgs()).toMatchObject({ enabled: false });
  });

  it.each<[string, Partial<ReviewProgress>]>([
    ["reviewReady is true", { reviewReady: true }],
    [
      "the status reached draft_report_pending_review",
      { status: "draft_report_pending_review" },
    ],
  ])("reports the review as ready when %s", (_label, overrides) => {
    pollState = {
      data: makeProgress(overrides),
      isFetching: false,
      error: null,
    };

    const { result } = renderHook(() => useSendForReviewAudit());

    expect(result.current.isReady).toBe(true);
    expect(result.current.uiMessage).toBe("Enviado para revisión. Esperando QC.");
  });

  it("calls onReady exactly once", () => {
    const progress = makeProgress({ reviewReady: true });
    pollState = { data: progress, isFetching: false, error: null };
    const onReady = vi.fn();

    const { rerender } = renderHook(() => useSendForReviewAudit({ onReady }));

    rerender();
    rerender();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(progress);
  });

  it("shows the sending message while the mutation is pending", () => {
    sendState = { isPending: true, error: null, data: undefined };

    const { result } = renderHook(() => useSendForReviewAudit());

    expect(result.current.isSending).toBe(true);
    expect(result.current.uiMessage).toBe("Enviando para revisión…");
  });

  it("shows the draft message once the review id is known", () => {
    mutateSendMock.mockImplementation(() => {
      capturedOptions?.onSuccess?.({ auditReviewId: "review-1" });
    });

    const { result } = renderHook(() => useSendForReviewAudit());

    act(() => result.current.start("audit-1"));

    expect(result.current.uiMessage).toBe("Generando borrador de informe…");
  });

  it("surfaces the send and poll errors", () => {
    const sendError: ApiError = { code: "CONFLICT", message: "already sent" };
    const pollError: ApiError = { code: "NOT_FOUND", message: "gone" };
    sendState = { isPending: false, error: sendError, data: undefined };
    pollState = { data: undefined, isFetching: true, error: pollError };

    const { result } = renderHook(() => useSendForReviewAudit());

    expect(result.current.sendError).toBe(sendError);
    expect(result.current.pollError).toBe(pollError);
    expect(result.current.isPolling).toBe(true);
  });

  it("exposes the progress fields coming from the polling", () => {
    const progress = makeProgress({ reviewReady: true });
    pollState = { data: progress, isFetching: false, error: null };

    const { result } = renderHook(() => useSendForReviewAudit());

    expect(result.current.progress).toBe(progress);
    expect(result.current.status).toBe("draft_report_in_review");
    expect(result.current.reviewReady).toBe(true);
  });
});
