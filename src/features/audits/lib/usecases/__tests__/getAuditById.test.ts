// ---------------------------------------------------------------------------
// Tests for the getAuditById use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditDetail } from "@entities/audit/model/audit-detail";

const defaultGetById = vi.fn();

vi.mock("@features/audits/api/audit.repo.impl", () => ({
  default: {
    getById: (...args: unknown[]) => defaultGetById(...args),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getAuditById } from "../getAuditById";

function makeDetail(overrides: Partial<AuditDetail> = {}): AuditDetail {
  return {
    id: "audit-1",
    flowId: "flow-1",
    version: 1,
    projectId: "project-1",
    facilityId: "facility-1",
    status: "draft_report_pending_review",
    auditDate: "2026-01-01T00:00:00Z",
    questions: [],
    reportItems: [],
    comments: [],
    ...overrides,
  };
}

function makeRepo(getById = vi.fn()) {
  return { getById, list: vi.fn(), delete: vi.fn() };
}

describe("getAuditById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the detail coming from the repository", async () => {
    const detail = makeDetail();
    const repo = makeRepo(vi.fn().mockResolvedValue(detail));

    await expect(getAuditById("audit-1", { repo })).resolves.toBe(detail);
    expect(repo.getById).toHaveBeenCalledWith("audit-1");
  });

  // Sin la guarda, un id vacio se traducia en GET /api/audits/ (la coleccion).
  it("rejects an empty id without reaching the repository", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeDetail()));

    await expect(getAuditById("", { repo })).rejects.toThrow(
      "getAuditById: auditId is required"
    );
    expect(repo.getById).not.toHaveBeenCalled();
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("not found")));

    await expect(getAuditById("audit-1", { repo })).rejects.toThrow("not found");
  });

  it("falls back to the default repository when no deps are given", async () => {
    const detail = makeDetail({ id: "audit-default" });
    defaultGetById.mockResolvedValue(detail);

    await expect(getAuditById("audit-default")).resolves.toBe(detail);
    expect(defaultGetById).toHaveBeenCalledWith("audit-default");
  });
});
