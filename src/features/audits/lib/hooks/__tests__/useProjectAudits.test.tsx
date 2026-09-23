/**
 * Auditorías de un proyecto: une las en curso y las completadas (el backend
 * excluye las completadas si no se pide el estado) y filtra por proyecto.
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

const refetchInProgress = vi.fn();
const refetchCompleted = vi.fn();

function stubLists(inProgress: ListState = {}, completed: ListState = {}) {
  useListAudits.mockImplementation((opts?: { status?: string }) => {
    const isCompleted = opts?.status === "completed";
    const state = isCompleted ? completed : inProgress;
    return {
      data: state.audits ? { audits: state.audits, total: state.audits.length } : undefined,
      isLoading: state.isLoading ?? false,
      isFetching: state.isFetching ?? false,
      isError: state.isError ?? false,
      refetch: isCompleted ? refetchCompleted : refetchInProgress,
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubLists();
});

describe("useProjectAudits", () => {
  it("asks for the audits in progress and the completed ones", () => {
    renderHook(() => useProjectAudits("project-1"));

    expect(useListAudits).toHaveBeenCalledWith({ enabled: true });
    expect(useListAudits).toHaveBeenCalledWith({ enabled: true, status: "completed" });
  });

  it("keeps only the audits of the project from both lists", () => {
    stubLists(
      {
        audits: [
          makeAudit({ id: "a" }),
          makeAudit({ id: "other", projectId: "project-2" }),
        ],
      },
      { audits: [makeAudit({ id: "b", status: "completed" })] }
    );

    const { result } = renderHook(() => useProjectAudits("project-1"));

    expect(result.current.audits.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("lists an audit that shows up in both responses once", () => {
    stubLists(
      { audits: [makeAudit({ id: "a" })] },
      { audits: [makeAudit({ id: "a", status: "completed" })] }
    );

    const { result } = renderHook(() => useProjectAudits("project-1"));

    expect(result.current.audits).toHaveLength(1);
    expect(result.current.audits[0]?.status).toBe("completed");
  });

  it("does not fetch nor return audits without a project", () => {
    stubLists({ audits: [makeAudit()] });

    const { result } = renderHook(() => useProjectAudits(undefined));

    expect(useListAudits).toHaveBeenCalledWith({ enabled: false });
    expect(result.current.audits).toEqual([]);
  });

  it.each([
    ["in progress", { isLoading: true }, {}],
    ["completed", {}, { isLoading: true }],
  ])("is loading while the %s list loads", (_label, inProgress, completed) => {
    stubLists(inProgress, completed);

    const { result } = renderHook(() => useProjectAudits("project-1"));

    expect(result.current.isLoading).toBe(true);
  });

  it("reports an error and fetching from either list", () => {
    stubLists({ isFetching: true }, { isError: true });

    const { result } = renderHook(() => useProjectAudits("project-1"));

    expect(result.current.isError).toBe(true);
    expect(result.current.isFetching).toBe(true);
  });

  it("refetches both lists", async () => {
    const { result } = renderHook(() => useProjectAudits("project-1"));

    await result.current.refetch();

    expect(refetchInProgress).toHaveBeenCalledTimes(1);
    expect(refetchCompleted).toHaveBeenCalledTimes(1);
  });
});
