// ---------------------------------------------------------------------------
// Tests for the deleteAudit use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

const defaultDelete = vi.fn();

vi.mock("@features/audits/api/audit.repo.impl", () => ({
  default: {
    getById: vi.fn(),
    list: vi.fn(),
    delete: (...args: unknown[]) => defaultDelete(...args),
  },
}));

import { deleteAudit } from "../deleteAudit";

function makeRepo(remove = vi.fn()) {
  return { getById: vi.fn(), list: vi.fn(), delete: remove };
}

describe("deleteAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the repository with the audit id", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(undefined));

    await expect(deleteAudit("audit-1", { repo })).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith("audit-1");
  });

  // Sin la guarda, un id vacio le pegaba a DELETE /api/audits/ (la coleccion).
  it("rejects an empty id without reaching the repository", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(undefined));

    await expect(deleteAudit("", { repo })).rejects.toThrow(
      "deleteAudit: auditId is required"
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("forbidden")));

    await expect(deleteAudit("audit-1", { repo })).rejects.toThrow("forbidden");
  });

  it("falls back to the default repository when no deps are given", async () => {
    defaultDelete.mockResolvedValue(undefined);

    await deleteAudit("audit-9");

    expect(defaultDelete).toHaveBeenCalledWith("audit-9");
  });
});
