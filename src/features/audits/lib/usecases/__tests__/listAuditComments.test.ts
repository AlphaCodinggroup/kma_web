// ---------------------------------------------------------------------------
// Tests for the listAuditComments use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditCommentsList } from "@entities/audit/model/comments";

const defaultListByAudit = vi.fn();

vi.mock("@features/audits/api/audit-comments.repo.impl", () => ({
  auditCommentsRepo: {
    createComment: vi.fn(),
    updateComment: vi.fn(),
    listByAudit: (...args: unknown[]) => defaultListByAudit(...args),
  },
}));

import { listAuditComments } from "../listAuditComments";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeList(overrides: Partial<AuditCommentsList> = {}): AuditCommentsList {
  return {
    comments: [
      {
        id: "comment-1",
        auditId: "audit-1",
        stepId: "step-1",
        userId: "user-1",
        content: "Looks good",
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
    ...overrides,
  };
}

function makeRepo(listByAudit = vi.fn()) {
  return {
    createComment: vi.fn(),
    updateComment: vi.fn(),
    listByAudit,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listAuditComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty string", ""],
    ["undefined", undefined as unknown as string],
    ["null", null as unknown as string],
  ])("throws when auditId is %s", async (_label, auditId) => {
    const repo = makeRepo();

    await expect(listAuditComments(auditId, { repo })).rejects.toThrow(
      "listAuditComments: auditId is required"
    );
    expect(repo.listByAudit).not.toHaveBeenCalled();
  });

  it("returns the list coming from the repository", async () => {
    const list = makeList();
    const repo = makeRepo(vi.fn().mockResolvedValue(list));

    await expect(listAuditComments("audit-1", { repo })).resolves.toBe(list);
    expect(repo.listByAudit).toHaveBeenCalledWith("audit-1");
  });

  it("returns an empty collection untouched", async () => {
    const list = makeList({ comments: [] });
    const repo = makeRepo(vi.fn().mockResolvedValue(list));

    await expect(listAuditComments("audit-1", { repo })).resolves.toEqual({
      comments: [],
    });
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("timeout")));

    await expect(listAuditComments("audit-1", { repo })).rejects.toThrow(
      "timeout"
    );
  });

  it("falls back to the default repository when no deps are given", async () => {
    const list = makeList();
    defaultListByAudit.mockResolvedValue(list);

    await expect(listAuditComments("audit-default")).resolves.toBe(list);
    expect(defaultListByAudit).toHaveBeenCalledWith("audit-default");
  });
});
