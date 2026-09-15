// ---------------------------------------------------------------------------
// Tests for the send-for-review use case factory
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SendForReviewResult } from "@entities/audit/model/sendReview";

const defaultSendForReview = vi.fn();
const defaultPollReview = vi.fn();

vi.mock("@features/audits/api/sendReview.repo.impl", () => ({
  auditReviewRepo: {
    sendForReview: (...args: unknown[]) => defaultSendForReview(...args),
    pollReview: (...args: unknown[]) => defaultPollReview(...args),
  },
}));

import { makeSendForReviewUsecase, sendForReview } from "../send-for-review";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  overrides: Partial<SendForReviewResult> = {}
): SendForReviewResult {
  return {
    auditId: "audit-1",
    auditReviewId: "review-1",
    status: "draft_report_pending_review",
    message: "Sent for review",
    reviewReady: false,
    ...overrides,
  };
}

function makeRepo(sendForReviewFn = vi.fn()) {
  return { sendForReview: sendForReviewFn, pollReview: vi.fn() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("makeSendForReviewUsecase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the injected repository with the audit id", async () => {
    const result = makeResult();
    const repo = makeRepo(vi.fn().mockResolvedValue(result));
    const usecase = makeSendForReviewUsecase({ repo });

    await expect(usecase("audit-1")).resolves.toBe(result);
    expect(repo.sendForReview).toHaveBeenCalledTimes(1);
    expect(repo.sendForReview).toHaveBeenCalledWith("audit-1");
  });

  // Sin la guarda, un id vacio pegaba en POST /api/audits//send-for-review.
  it("rejects an empty audit id without reaching the repository", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeResult()));
    const usecase = makeSendForReviewUsecase({ repo });

    await expect(usecase("")).rejects.toThrow(
      "sendForReview: auditId is required"
    );
    expect(repo.sendForReview).not.toHaveBeenCalled();
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("bad gateway")));
    const usecase = makeSendForReviewUsecase({ repo });

    await expect(usecase("audit-1")).rejects.toThrow("bad gateway");
  });
});

describe("sendForReview (default instance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the repository registered in the features layer", async () => {
    const result = makeResult({ auditId: "audit-default" });
    defaultSendForReview.mockResolvedValue(result);

    await expect(sendForReview("audit-default")).resolves.toBe(result);
    expect(defaultSendForReview).toHaveBeenCalledWith("audit-default");
  });
});
