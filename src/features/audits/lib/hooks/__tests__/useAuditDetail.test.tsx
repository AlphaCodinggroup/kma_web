// ---------------------------------------------------------------------------
// Tests for the useAuditDetail query hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditDetail } from "@entities/audit/model/audit-detail";

const getAuditByIdMock = vi.fn();

vi.mock("@features/audits/lib/usecases/getAuditById", () => ({
  default: (...args: unknown[]) => getAuditByIdMock(...args),
  getAuditById: (...args: unknown[]) => getAuditByIdMock(...args),
}));

import { useAuditDetail, auditDetailKey } from "../useAuditDetail";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("auditDetailKey", () => {
  it("builds a stable cache key", () => {
    expect(auditDetailKey("audit-1")).toEqual(["audits", "detail", "audit-1"]);
  });
});

describe("useAuditDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the audit detail", async () => {
    const detail = makeDetail();
    getAuditByIdMock.mockResolvedValue(detail);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditDetail("audit-1", { retry: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(detail);
    expect(getAuditByIdMock).toHaveBeenCalledWith("audit-1");
    expect(client.getQueryData(auditDetailKey("audit-1"))).toEqual(detail);
  });

  it("exposes the use case error", async () => {
    getAuditByIdMock.mockRejectedValue(new Error("not found"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditDetail("audit-1", { retry: false }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("not found");
  });

  it.each([
    ["there is no audit id", undefined],
    ["the audit id is empty", ""],
  ])("stays disabled when %s", (_label, auditId) => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuditDetail(auditId), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getAuditByIdMock).not.toHaveBeenCalled();
  });

  it("honours an explicit enabled: false", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditDetail("audit-1", { enabled: false }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getAuditByIdMock).not.toHaveBeenCalled();
  });
});
