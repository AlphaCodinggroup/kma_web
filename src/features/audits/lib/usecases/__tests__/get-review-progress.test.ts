// ---------------------------------------------------------------------------
// Tests for the get-review-progress use case factory
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReviewProgress } from "@entities/audit/model/sendReview";

const defaultSendForReview = vi.fn();
const defaultPollReview = vi.fn();

vi.mock("@features/audits/api/sendReview.repo.impl", () => ({
  auditReviewRepo: {
    sendForReview: (...args: unknown[]) => defaultSendForReview(...args),
    pollReview: (...args: unknown[]) => defaultPollReview(...args),
  },
}));

import {
  makeGetReviewProgressUsecase,
  getReviewProgress,
} from "../get-review-progress";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProgress(overrides: Partial<ReviewProgress> = {}): ReviewProgress {
  return {
    auditId: "audit-1",
    auditReviewId: "review-1",
    status: "draft_report_pending_review",
    message: "Generating draft",
    reviewReady: false,
    ...overrides,
  };
}

function makeRepo(pollReview = vi.fn()) {
  return { sendForReview: vi.fn(), pollReview };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("makeGetReviewProgressUsecase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["a review still in progress", false],
    ["a review already finished", true],
  ])("returns the progress for %s", async (_label, reviewReady) => {
    const progress = makeProgress({ reviewReady });
    const repo = makeRepo(vi.fn().mockResolvedValue(progress));
    const usecase = makeGetReviewProgressUsecase({ repo });

    await expect(usecase("review-1")).resolves.toBe(progress);
    expect(repo.pollReview).toHaveBeenCalledWith("review-1");
  });

  it("rejects an empty review id without reaching the repository", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProgress()));
    const usecase = makeGetReviewProgressUsecase({ repo });

    await expect(usecase("")).rejects.toThrow(
      "getReviewProgress: auditReviewId is required"
    );
    expect(repo.pollReview).not.toHaveBeenCalled();
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("not found")));
    const usecase = makeGetReviewProgressUsecase({ repo });

    await expect(usecase("review-1")).rejects.toThrow("not found");
  });
});

describe("getReviewProgress (default instance)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the repository registered in the features layer", async () => {
    const progress = makeProgress({ auditReviewId: "review-default" });
    defaultPollReview.mockResolvedValue(progress);

    await expect(getReviewProgress("review-default")).resolves.toBe(progress);
    expect(defaultPollReview).toHaveBeenCalledWith("review-default");
  });
});
