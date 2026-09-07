// ---------------------------------------------------------------------------
// Tests for the updateAuditFinding use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  AuditFindingUpdateResult,
  UpdateAuditFindingInput,
} from "@entities/audit/model/audit-review-finding-update";

const defaultUpdateFinding = vi.fn();

vi.mock("@features/audits/api/audit-review.repo.impl", () => ({
  auditReviewDetailRepo: {
    getReviewDetail: vi.fn(),
    completeReview: vi.fn(),
    updateStatus: vi.fn(),
    updateFinding: (...args: unknown[]) => defaultUpdateFinding(...args),
  },
}));

import { updateAuditFinding } from "../updateAuditFinding";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  overrides: Partial<AuditFindingUpdateResult> = {}
): AuditFindingUpdateResult {
  return {
    auditId: "audit-1",
    questionCode: "Q-1",
    status: "updated",
    message: "Finding updated",
    ...overrides,
  };
}

function makeRepo(updateFinding = vi.fn()) {
  return {
    getReviewDetail: vi.fn(),
    completeReview: vi.fn(),
    updateStatus: vi.fn(),
    updateFinding,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateAuditFinding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<[string, UpdateAuditFindingInput, string]>([
    [
      "auditId is empty",
      { auditId: "", questionCode: "Q-1", quantity: 1 },
      "updateAuditFinding: auditId is required",
    ],
    [
      "questionCode is empty",
      { auditId: "audit-1", questionCode: "", quantity: 1 },
      "updateAuditFinding: questionCode is required",
    ],
    [
      "no updatable field is provided",
      { auditId: "audit-1", questionCode: "Q-1" },
      "updateAuditFinding: at least one field (quantity, notes or photos) must be provided",
    ],
    [
      "quantity is NaN",
      { auditId: "audit-1", questionCode: "Q-1", quantity: Number.NaN },
      "updateAuditFinding: quantity must be a finite number",
    ],
    [
      "quantity is Infinity",
      {
        auditId: "audit-1",
        questionCode: "Q-1",
        quantity: Number.POSITIVE_INFINITY,
      },
      "updateAuditFinding: quantity must be a finite number",
    ],
  ])("throws when %s", async (_label, input, message) => {
    const repo = makeRepo();

    await expect(
      updateAuditFinding(input, { auditReviewRepo: repo })
    ).rejects.toThrow(message);
    expect(repo.updateFinding).not.toHaveBeenCalled();
  });

  it("accepts a null quantity as an explicit reset", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeResult()));

    await updateAuditFinding(
      { auditId: "audit-1", questionCode: "Q-1", quantity: null },
      { auditReviewRepo: repo }
    );

    expect(repo.updateFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-1",
      quantity: null,
    });
  });

  it("trims the notes and drops fields that were not provided", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeResult()));

    await updateAuditFinding(
      { auditId: "audit-1", questionCode: "Q-1", notes: "  needs a photo  " },
      { auditReviewRepo: repo }
    );

    expect(repo.updateFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-1",
      notes: "needs a photo",
    });
  });

  it("keeps a null notes value without trimming it", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeResult()));

    await updateAuditFinding(
      { auditId: "audit-1", questionCode: "Q-1", notes: null },
      { auditReviewRepo: repo }
    );

    expect(repo.updateFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-1",
      notes: null,
    });
  });

  it("forwards the photos collection as is", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeResult()));
    const photos = [{ url: "https://cdn.test/a.jpg", includeInReport: true }];

    await updateAuditFinding(
      { auditId: "audit-1", questionCode: "Q-1", photos },
      { auditReviewRepo: repo }
    );

    expect(repo.updateFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-1",
      photos,
    });
  });

  it("builds a payload with every provided field", async () => {
    const result = makeResult();
    const repo = makeRepo(vi.fn().mockResolvedValue(result));
    const photos = [{ url: "https://cdn.test/a.jpg" }];

    await expect(
      updateAuditFinding(
        {
          auditId: "audit-1",
          questionCode: "Q-1",
          quantity: 4,
          notes: " ok ",
          photos,
        },
        { auditReviewRepo: repo }
      )
    ).resolves.toBe(result);

    expect(repo.updateFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-1",
      quantity: 4,
      notes: "ok",
      photos,
    });
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("server down")));

    await expect(
      updateAuditFinding(
        { auditId: "audit-1", questionCode: "Q-1", quantity: 1 },
        { auditReviewRepo: repo }
      )
    ).rejects.toThrow("server down");
  });

  it("falls back to the default repository when no deps are given", async () => {
    const result = makeResult();
    defaultUpdateFinding.mockResolvedValue(result);

    await expect(
      updateAuditFinding({
        auditId: "audit-default",
        questionCode: "Q-9",
        quantity: 2,
      })
    ).resolves.toBe(result);
    expect(defaultUpdateFinding).toHaveBeenCalledWith({
      auditId: "audit-default",
      questionCode: "Q-9",
      quantity: 2,
    });
  });
});
