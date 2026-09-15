import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditReportKey } from "../useAuditReport";
import { usePollAuditReport } from "../usePollAuditReport";

const getReport = vi.fn();
vi.mock("@features/reports/api/audit-report.repo.impl", () => ({
  auditReportRepo: { getReport: (...args: unknown[]) => getReport(...args) },
}));
vi.mock("@shared/config/env", () => ({
  publicEnv: () => ({ reportPoll: { intervalMs: 10, maxAttempts: 60 } }),
}));

const pendingReport = {
  id: "audit-1",
  flowId: "flow-1",
  userId: "user-1",
  status: "final_report_sent_to_client" as const,
  reportName: "Project",
  reportUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: null,
  completedAt: null,
  reportProgress: null,
};
const readyReport = {
  ...pendingReport,
  status: "completed" as const,
  reportUrl: "https://files.test/report.pdf",
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("usePollAuditReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shares the audit report cache key and stops when the URL arrives", async () => {
    getReport
      .mockResolvedValueOnce(pendingReport)
      .mockResolvedValue(readyReport);
    const { client, wrapper } = setup();

    const { result } = renderHook(
      () =>
        usePollAuditReport({
          auditId: "audit-1",
          refetchIntervalMs: 10,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data?.reportUrl).toBe(readyReport.reportUrl));
    expect(client.getQueryData(auditReportKey("audit-1"))).toEqual(readyReport);
    const callsAfterReady = getReport.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(getReport).toHaveBeenCalledTimes(callsAfterReady);

    const query = client.getQueryCache().find({
      queryKey: auditReportKey("audit-1"),
    });
    const queryOptions = query?.options as {
      staleTime?: number;
      refetchIntervalInBackground?: boolean;
    };
    expect(queryOptions.staleTime).toBe(0);
    expect(queryOptions.refetchIntervalInBackground).toBe(true);
  });

  it("does not request a report without an id or while disabled", async () => {
    const { wrapper } = setup();
    renderHook(
      () =>
        usePollAuditReport({
          auditId: undefined,
          enabled: true,
          refetchIntervalMs: 10,
        }),
      { wrapper }
    );
    renderHook(
      () =>
        usePollAuditReport({
          auditId: "audit-1",
          enabled: false,
          refetchIntervalMs: 10,
        }),
      { wrapper }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getReport).not.toHaveBeenCalled();
  });
});
