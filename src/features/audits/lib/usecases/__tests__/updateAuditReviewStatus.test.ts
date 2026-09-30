// ---------------------------------------------------------------------------
// Tests for the updateAuditReviewStatus use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditStatus } from "@entities/audit/model";
import type {
  AuditReviewStatusChange,
  UpdateAuditReviewStatusInput,
} from "@entities/audit/model/audit-review-status";

const defaultUpdateStatus = vi.fn();

vi.mock("@features/audits/api/audit-review.repo.impl", () => ({
  auditReviewDetailRepo: {
    getReviewDetail: vi.fn(),
    completeReview: vi.fn(),
    updateStatus: (...args: unknown[]) => defaultUpdateStatus(...args),
    updateFinding: vi.fn(),
  },
}));

import { updateAuditReviewStatus } from "../updateAuditReviewStatus";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChange(
  overrides: Partial<AuditReviewStatusChange> = {}
): AuditReviewStatusChange {
  return {
    auditId: "audit-1",
    oldStatus: "draft_report_pending_review",
    newStatus: "draft_report_in_review",
    message: "Status updated",
    ...overrides,
  };
}

function makeRepo(updateStatus = vi.fn()) {
  return {
    getReviewDetail: vi.fn(),
    completeReview: vi.fn(),
    updateStatus,
    updateFinding: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateAuditReviewStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<[string, UpdateAuditReviewStatusInput, string]>([
    [
      "auditId is empty",
      { auditId: "", status: "draft_report_in_review" },
      "updateAuditReviewStatus: auditId is required",
    ],
    [
      "status is empty",
      { auditId: "audit-1", status: "" as AuditStatus },
      "updateAuditReviewStatus: status is required",
    ],
  ])("throws when %s", async (_label, input, message) => {
    const repo = makeRepo();

    await expect(
      updateAuditReviewStatus(input, { auditReviewRepo: repo })
    ).rejects.toThrow(message);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it.each<AuditStatus>([
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ])("calls the repository with status %s", async (status) => {
    const change = makeChange({ newStatus: status });
    const repo = makeRepo(vi.fn().mockResolvedValue(change));

    await expect(
      updateAuditReviewStatus(
        { auditId: "audit-1", status },
        { auditReviewRepo: repo }
      )
    ).resolves.toBe(change);

    expect(repo.updateStatus).toHaveBeenCalledWith({
      auditId: "audit-1",
      status,
    });
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("forbidden")));

    await expect(
      updateAuditReviewStatus(
        { auditId: "audit-1", status: "completed" },
        { auditReviewRepo: repo }
      )
    ).rejects.toThrow("forbidden");
  });

  it("falls back to the default repository when no deps are given", async () => {
    const change = makeChange();
    defaultUpdateStatus.mockResolvedValue(change);

    await expect(
      updateAuditReviewStatus({
        auditId: "audit-default",
        status: "completed",
      })
    ).resolves.toBe(change);
    expect(defaultUpdateStatus).toHaveBeenCalledWith({
      auditId: "audit-default",
      status: "completed",
    });
  });
});
