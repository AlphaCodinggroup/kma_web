// ---------------------------------------------------------------------------
// Tests for the listAudits use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditType, Audit } from "@entities/audit/model";
import type { AuditListParams } from "@entities/audit/api/audit.repo";

// El repo por defecto arrastra el cliente HTTP real: se reemplaza antes de
// importar el caso de uso.
const defaultList = vi.fn();

vi.mock("@features/audits/api/audit.repo.impl", () => ({
  default: {
    getById: vi.fn(),
    list: (...args: unknown[]) => defaultList(...args),
    delete: vi.fn(),
  },
}));

import { listAudits } from "../listAudits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    id: "audit-1",
    flowId: "flow-1",
    version: 1,
    projectId: "project-1",
    facilityId: "facility-1",
    status: "draft_report_pending_review",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    projectName: "Project 1",
    auditorName: "Auditor 1",
    facilityName: "Facility 1",
    findingsCount: 3,
    ...overrides,
  };
}

function makePage(overrides: Partial<AuditType> = {}): AuditType {
  return { audits: [makeAudit()], total: 1, ...overrides };
}

function makeRepo(list = vi.fn()) {
  return { getById: vi.fn(), list, delete: vi.fn() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listAudits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the page coming from the repository", async () => {
    const page = makePage();
    const repo = makeRepo(vi.fn().mockResolvedValue(page));

    await expect(listAudits({ repo })).resolves.toBe(page);
    expect(repo.list).toHaveBeenCalledTimes(1);
  });

  it.each<[string, AuditListParams | undefined]>([
    ["no params", undefined],
    ["a status filter", { status: "completed" }],
    ["an auditor filter", { auditor: "auditor-1" }],
    ["pagination params", { limit: 50, last_eval_id: "cursor-1" }],
    [
      "every filter at once",
      { status: "completed", auditor: "auditor-1", limit: 10, last_eval_id: "c" },
    ],
  ])("forwards %s to the repository", async (_label, params) => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makePage()));

    await listAudits(params ? { repo, params } : { repo });

    expect(repo.list).toHaveBeenCalledWith(params);
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("boom")));

    await expect(listAudits({ repo })).rejects.toThrow("boom");
  });

  it("falls back to the default repository when no deps are given", async () => {
    const page = makePage({ total: 7 });
    defaultList.mockResolvedValue(page);

    await expect(listAudits()).resolves.toBe(page);
    expect(defaultList).toHaveBeenCalledWith(undefined);
  });
});
