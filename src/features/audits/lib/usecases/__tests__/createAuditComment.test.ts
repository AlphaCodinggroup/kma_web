// ---------------------------------------------------------------------------
// Tests for the createAuditComment use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  AuditReviewComment,
  CreateAuditCommentInput,
} from "@entities/audit/model/comments";

// El repo por defecto arrastra el cliente HTTP real: se reemplaza.
const defaultCreateComment = vi.fn();

vi.mock("@features/audits/api/audit-comments.repo.impl", () => ({
  auditCommentsRepo: {
    createComment: (...args: unknown[]) => defaultCreateComment(...args),
    updateComment: vi.fn(),
    listByAudit: vi.fn(),
  },
}));

import { createAuditComment } from "../createAuditComment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(
  overrides: Partial<CreateAuditCommentInput> = {}
): CreateAuditCommentInput {
  return {
    auditId: "audit-1",
    stepId: "step-1",
    content: "Looks good",
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
    content: "Looks good",
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRepo(createComment = vi.fn()) {
  return {
    createComment,
    updateComment: vi.fn(),
    listByAudit: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createAuditComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["auditId is empty", { auditId: "" }, "createAuditComment: auditId is required"],
    ["stepId is empty", { stepId: "" }, "createAuditComment: stepId is required"],
    ["content is empty", { content: "" }, "createAuditComment: content is required"],
    [
      "content is only whitespace",
      { content: "   \n\t " },
      "createAuditComment: content is required",
    ],
  ])("throws when %s", async (_label, overrides, message) => {
    const repo = makeRepo();

    await expect(
      createAuditComment(makeInput(overrides), { repo })
    ).rejects.toThrow(message);
    expect(repo.createComment).not.toHaveBeenCalled();
  });

  it("validates auditId before stepId and content", async () => {
    const repo = makeRepo();

    await expect(
      createAuditComment(
        makeInput({ auditId: "", stepId: "", content: "" }),
        { repo }
      )
    ).rejects.toThrow("createAuditComment: auditId is required");
  });

  it("trims the content before hitting the repository", async () => {
    const comment = makeComment();
    const repo = makeRepo(vi.fn().mockResolvedValue(comment));

    const result = await createAuditComment(
      makeInput({ content: "  Needs a photo  " }),
      { repo }
    );

    expect(result).toBe(comment);
    expect(repo.createComment).toHaveBeenCalledWith({
      auditId: "audit-1",
      stepId: "step-1",
      content: "Needs a photo",
    });
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("network down")));

    await expect(createAuditComment(makeInput(), { repo })).rejects.toThrow(
      "network down"
    );
  });

  it("falls back to the default repository when no deps are given", async () => {
    const comment = makeComment();
    defaultCreateComment.mockResolvedValue(comment);

    await expect(createAuditComment(makeInput())).resolves.toBe(comment);
    expect(defaultCreateComment).toHaveBeenCalledTimes(1);
  });
});
