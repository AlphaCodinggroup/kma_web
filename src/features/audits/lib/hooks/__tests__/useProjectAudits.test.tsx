/**
 * Auditorías de un proyecto: una sola consulta al backend con `project_id`,
 * que ya devuelve todos los estados, completadas incluidas.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";

const useListAudits = vi.fn();

vi.mock("@features/audits/lib/hooks/useListAudits", () => ({
  default: function useListAuditsStub(...args: unknown[]) {
    return useListAudits(...args);
  },
}));

import { useProjectAudits } from "../useProjectAudits";

const makeAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  flowId: "flow-1",
  version: 1,
  projectId: "project-1",
  facilityId: "facility-1",
  status: "draft_report_pending_review",
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-01-16T10:30:00Z",
  projectName: null,
  auditorName: null,
  facilityName: null,
  findingsCount: null,
  ...overrides,
});

type ListState = {
  audits?: Audit[];
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
};

const refetch = vi.fn();

function stubList(state: ListState = {}) {
  useListAudits.mockReturnValue({
    data: state.audits ? { audits: state.audits, total: state.audits.length } : undefined,
    isLoading: state.isLoading ?? false,
    isFetching: state.isFetching ?? false,
    isError: state.isError ?? false,
    refetch,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubList();
});

describe("useProjectAudits", () => {
  it("asks the backend for the project's audits in a single query", () => {
    renderHook(() => useProjectAudits("project-1"));

    expect(useListAudits).toHaveBeenCalledTimes(1);
    expect(useListAudits).toHaveBeenCalledWith({
      enabled: true,
      projectId: "project-1",
    });
  });

  it("returns what the backend sent, completed audits included", () => {
    stubList({
      audits: [
        makeAudit({ id: "a" }),
        makeAudit({ id: "b", status: "completed" }),
      ],
    });

    const { result } = renderHook(() => useProjectAudits("project-1"));

    expect(result.current.audits.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("does not fetch nor return audits without a project", () => {
    stubList({ audits: [makeAudit()] });

    const { result } = renderHook(() => useProjectAudits(undefined));

    expect(useListAudits).toHaveBeenCalledWith({ enabled: false });
    expect(result.current.audits).toEqual([]);
  });

  it("reports loading, fetching and error from the query", () => {
    stubList({ isLoading: true, isFetching: true, isError: true });

    const { result } = renderHook(() => useProjectAudits("project-1"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isError).toBe(true);
  });

  it("refetches the query", async () => {
    const { result } = renderHook(() => useProjectAudits("project-1"));

    await result.current.refetch();

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
