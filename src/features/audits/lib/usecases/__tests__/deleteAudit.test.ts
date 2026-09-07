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

  it("forwards an empty id without validating it", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(undefined));

    await deleteAudit("", { repo });

    // FIXME: el caso de uso no valida el id, asi que un id vacio llega al
    // repositorio y termina pegandole a DELETE /api/audits/ (lista completa).
    expect(repo.delete).toHaveBeenCalledWith("");
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
