// ---------------------------------------------------------------------------
// Tests for the completeReviewAudit use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";

// El repo por defecto vive en la capa api y arrastra el cliente HTTP real:
// se reemplaza antes de importar el caso de uso.
const defaultCompleteReview = vi.fn();

vi.mock("@features/audits/api/audit-review.repo.impl", () => ({
  auditReviewDetailRepo: {
    getReviewDetail: vi.fn(),
    completeReview: (...args: unknown[]) => defaultCompleteReview(...args),
    updateStatus: vi.fn(),
    updateFinding: vi.fn(),
  },
}));

import { completeReviewAudit } from "../completeReviewAudit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  overrides: Partial<CompleteReviewResult> = {}
): CompleteReviewResult {
  return {
    auditId: "audit-1",
    status: "final_report_sent_to_client",
    message: "Review completed",
    requestId: "req-1",
    ...overrides,
  };
}

function makeRepo(completeReview = vi.fn()) {
  return {
    getReviewDetail: vi.fn(),
    completeReview,
    updateStatus: vi.fn(),
    updateFinding: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("completeReviewAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty string", ""],
    ["undefined", undefined as unknown as string],
    ["null", null as unknown as string],
  ])("throws when auditId is %s", async (_label, auditId) => {
    const repo = makeRepo();

    await expect(
      completeReviewAudit(auditId, { auditReviewRepo: repo })
    ).rejects.toThrow("completeReviewAudit: auditId is required");
    expect(repo.completeReview).not.toHaveBeenCalled();
  });

  it("calls the repository with the audit id", async () => {
    const result = makeResult();
    const repo = makeRepo(vi.fn().mockResolvedValue(result));

    await expect(
      completeReviewAudit("audit-1", { auditReviewRepo: repo })
    ).resolves.toBe(result);
    expect(repo.completeReview).toHaveBeenCalledTimes(1);
    expect(repo.completeReview).toHaveBeenCalledWith("audit-1");
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("boom")));

    await expect(
      completeReviewAudit("audit-1", { auditReviewRepo: repo })
    ).rejects.toThrow("boom");
  });

  it("falls back to the default repository when no deps are given", async () => {
    const result = makeResult({ auditId: "audit-default" });
    defaultCompleteReview.mockResolvedValue(result);

    await expect(completeReviewAudit("audit-default")).resolves.toBe(result);
    expect(defaultCompleteReview).toHaveBeenCalledWith("audit-default");
  });
});
