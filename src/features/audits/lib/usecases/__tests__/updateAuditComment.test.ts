// ---------------------------------------------------------------------------
// Tests for the updateAuditComment use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  AuditReviewComment,
  UpdateAuditCommentInput,
} from "@entities/audit/model/comments";

const defaultUpdateComment = vi.fn();

vi.mock("@features/audits/api/audit-comments.repo.impl", () => ({
  auditCommentsRepo: {
    createComment: vi.fn(),
    updateComment: (...args: unknown[]) => defaultUpdateComment(...args),
    listByAudit: vi.fn(),
  },
}));

import { updateAuditComment } from "../updateAuditComment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(
  overrides: Partial<UpdateAuditCommentInput> = {}
): UpdateAuditCommentInput {
  return {
    commentId: "comment-1",
    auditId: "audit-1",
    stepId: "step-1",
    content: "Updated content",
    ...overrides,
  };
}

function makeComment(
  overrides: Partial<AuditReviewComment> = {}
): AuditReviewComment {
  return {
    id: "comment-1",
    auditId: "audit-1",
    stepId: "step-1",
    userId: "user-1",
    content: "Updated content",
    version: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function makeRepo(updateComment = vi.fn()) {
  return {
    createComment: vi.fn(),
    updateComment,
    listByAudit: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateAuditComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<[string, Partial<UpdateAuditCommentInput>, string]>([
    [
      "commentId is empty",
      { commentId: "" },
      "updateAuditComment: commentId is required",
    ],
    [
      "auditId is empty",
      { auditId: "" },
      "updateAuditComment: auditId is required",
    ],
    ["stepId is empty", { stepId: "" }, "updateAuditComment: stepId is required"],
    [
      "content is empty",
      { content: "" },
      "updateAuditComment: content is required",
    ],
    [
      "content is only whitespace",
      { content: "  \t\n " },
      "updateAuditComment: content is required",
    ],
  ])("throws when %s", async (_label, overrides, message) => {
    const repo = makeRepo();

    await expect(
      updateAuditComment(makeInput(overrides), { repo })
    ).rejects.toThrow(message);
    expect(repo.updateComment).not.toHaveBeenCalled();
  });

  it("validates commentId before every other field", async () => {
    const repo = makeRepo();

    await expect(
      updateAuditComment(
        makeInput({ commentId: "", auditId: "", stepId: "", content: "" }),
        { repo }
      )
    ).rejects.toThrow("updateAuditComment: commentId is required");
  });

  it("trims the content before hitting the repository", async () => {
    const comment = makeComment();
    const repo = makeRepo(vi.fn().mockResolvedValue(comment));

    const result = await updateAuditComment(
      makeInput({ content: "   Needs rework   " }),
      { repo }
    );

    expect(result).toBe(comment);
    expect(repo.updateComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      auditId: "audit-1",
      stepId: "step-1",
      content: "Needs rework",
    });
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("conflict")));

    await expect(updateAuditComment(makeInput(), { repo })).rejects.toThrow(
      "conflict"
    );
  });

  it("falls back to the default repository when no deps are given", async () => {
    const comment = makeComment();
    defaultUpdateComment.mockResolvedValue(comment);

    await expect(updateAuditComment(makeInput())).resolves.toBe(comment);
    expect(defaultUpdateComment).toHaveBeenCalledTimes(1);
  });
});
