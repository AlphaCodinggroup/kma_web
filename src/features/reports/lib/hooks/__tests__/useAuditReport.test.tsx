// ---------------------------------------------------------------------------
// Tests for the useAuditReport query hook
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AuditReport } from "@entities/report/model/audit-report";

const getReportMock = vi.fn();

vi.mock("@features/reports/api/audit-report.repo.impl", () => ({
  auditReportRepo: {
    getReport: (...args: unknown[]) => getReportMock(...args),
  },
  createAuditReportRepo: vi.fn(),
}));

import { useAuditReport, auditReportKey } from "../useAuditReport";

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

/** El shape real del reporte no importa acá: sólo que viaje sin transformar. */
function makeReport(): AuditReport {
  return { auditId: "audit-1" } as unknown as AuditReport;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("auditReportKey", () => {
  it("builds a stable cache key", () => {
    expect(auditReportKey("audit-1")).toEqual([
      "reports",
      "by-audit",
      "audit-1",
    ]);
  });
});

describe("useAuditReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and then resolves with the report", async () => {
    const report = makeReport();
    getReportMock.mockResolvedValue(report);
    const { client, wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditReport("audit-1", { retry: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(report);
    expect(getReportMock).toHaveBeenCalledWith("audit-1");
    expect(client.getQueryData(auditReportKey("audit-1"))).toEqual(report);
  });

  it("exposes the repository error", async () => {
    getReportMock.mockRejectedValue({ code: "NOT_FOUND", message: "gone" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditReport("audit-1", { retry: false }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([
    ["there is no audit id", undefined],
    ["the audit id is empty", ""],
  ])("stays disabled when %s", (_label, auditId) => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuditReport(auditId), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getReportMock).not.toHaveBeenCalled();
  });

  // El id manda sobre `enabled`: con `enabled: true` y sin auditId el hook
  // cortocircuita en vez de pedirle el reporte de un id vacío al repositorio.
  it("does not query without an audit id even when the caller forces enabled", () => {
    getReportMock.mockResolvedValue(makeReport());
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useAuditReport(undefined, { enabled: true, retry: false }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(getReportMock).not.toHaveBeenCalled();
  });
});
