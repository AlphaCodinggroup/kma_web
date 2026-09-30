// ---------------------------------------------------------------------------
// Tests for the useListAudits query hook and its prefetch helper
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { Audit, AuditType } from "@entities/audit/model";

const listAuditsMock = vi.fn();

vi.mock("@features/audits/lib/usecases/listAudits", () => ({
  default: (...args: unknown[]) => listAuditsMock(...args),
  listAudits: (...args: unknown[]) => listAuditsMock(...args),
}));

import useListAudits, { prefetchListAudits } from "../useListAudits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, wrapper };
}

function makeAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    id: "audit-1",
    flowId: "flow-1",
    version: 1,
    projectId: "project-1",
    facilityId: "facility-1",
    status: "completed",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    projectName: "Project 1",
    auditorName: "Auditor 1",
    facilityName: "Facility 1",
    findingsCount: 1,
    ...overrides,
  };
}

function makePage(overrides: Partial<AuditType> = {}): AuditType {
  return { audits: [makeAudit()], total: 1, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useListAudits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the audits page", async () => {
    const page = makePage();
    listAuditsMock.mockResolvedValue(page);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useListAudits(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
  });

  it("applies the default limit when no options are given", async () => {
    listAuditsMock.mockResolvedValue(makePage());
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useListAudits(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listAuditsMock).toHaveBeenCalledWith({ params: { limit: 200 } });
  });

  it("only forwards the filters that were provided", async () => {
    listAuditsMock.mockResolvedValue(makePage());
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useListAudits({
          status: "completed",
          auditor: "auditor-1",
          limit: 25,
          last_eval_id: "cursor-1",
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listAuditsMock).toHaveBeenCalledWith({
      params: {
        limit: 25,
        status: "completed",
        auditor: "auditor-1",
        last_eval_id: "cursor-1",
      },
    });
  });

  it("keys the cache by status, auditor and cursor", async () => {
    listAuditsMock.mockResolvedValue(makePage());
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(
      () => useListAudits({ status: "completed" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      client.getQueryData(["audits", "list", "completed", undefined, undefined])
    ).toBeDefined();
  });

  it("stays disabled when enabled is false", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useListAudits({ enabled: false }), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(listAuditsMock).not.toHaveBeenCalled();
  });

  it("exposes the use case error", async () => {
    listAuditsMock.mockRejectedValue(new Error("server down"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useListAudits(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });
    expect(result.current.error?.message).toBe("server down");
  });
});

describe("prefetchListAudits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fills the cache with the unfiltered list", async () => {
    const page = makePage({ total: 3 });
    listAuditsMock.mockResolvedValue(page);
    const client = new QueryClient();

    await prefetchListAudits(client);

    expect(listAuditsMock).toHaveBeenCalledWith();
    expect(
      client.getQueryData(["audits", "list", undefined, undefined, undefined])
    ).toEqual(page);
  });
});
