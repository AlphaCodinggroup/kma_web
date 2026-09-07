import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditReport } from "@entities/report/model/audit-report";
import {
  generationMessage,
  useExportAuditReport,
} from "../useExportAuditReport";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  resetMutation: vi.fn(),
  refetch: vi.fn(),
  poll: {
    data: undefined as AuditReport | undefined,
    isError: false,
    error: null as Error | null,
  },
  download: vi.fn(),
  cancel: vi.fn(),
  resetDownload: vi.fn(),
  downloadState: {
    progress: null as {
      receivedBytes: number;
      totalBytes: number | null;
      percent: number | null;
    } | null,
  },
}));

vi.mock("@shared/config/env", () => ({
  publicEnv: () => ({
    reportPoll: { intervalMs: 2_000, maxAttempts: 60 },
    reportEstimateMs: 30_000,
    reportTimeoutMs: 180_000,
    reportDownloadMode: "stream",
    reportStreamMaxBytes: 200 * 1024 * 1024,
  }),
}));
vi.mock("../useCompleteReviewAuditMutation", () => ({
  useCompleteReviewAuditMutation: () => ({
    mutateAsync: mocks.mutateAsync,
    reset: mocks.resetMutation,
  }),
}));
vi.mock("@features/reports/lib/hooks/useAuditReport", () => ({
  useAuditReport: () => ({ refetch: mocks.refetch }),
}));
vi.mock("@features/reports/lib/hooks/usePollAuditReport", () => ({
  usePollAuditReport: () => mocks.poll,
}));
vi.mock("@features/reports/lib/hooks/useDownloadReportFile", () => ({
  reportFileName: (name: string | null) =>
    `${name?.replaceAll(" ", "") || "report"}.pdf`,
  useDownloadReportFile: () => ({
    download: mocks.download,
    cancel: mocks.cancel,
    reset: mocks.resetDownload,
    progress: mocks.downloadState.progress,
  }),
}));

const pendingReport: AuditReport = {
  id: "audit-1",
  flowId: "flow-1",
  userId: "user-1",
  status: "final_report_sent_to_client",
  reportName: "My Project",
  reportUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: null,
  completedAt: null,
};
const readyReport: AuditReport = {
  ...pendingReport,
  status: "completed",
  reportUrl: "https://files.test/report.pdf",
};

describe("generationMessage", () => {
  it.each([
    ["loading_audit", "Preparing audit data…"],
    ["validating_audit", "Preparing audit data…"],
    ["loading_project_audits", "Preparing audit data…"],
    ["filtering_reviews", "Consolidating project findings…"],
    ["enriching_findings", "Consolidating project findings…"],
    ["consolidating_report", "Consolidating project findings…"],
    ["formatting_report", "Consolidating project findings…"],
    ["rendering_pdf", "Rendering the PDF…"],
    ["uploading_report", "Uploading the report…"],
    ["finalizing_audits", "Finalizing the report…"],
    [null, "Generating the report…"],
  ])("maps %s", (step, expected) => {
    expect(generationMessage(step)).toBe(expected);
  });
});

describe("useExportAuditReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.poll.data = undefined;
    mocks.poll.isError = false;
    mocks.poll.error = null;
    mocks.downloadState.progress = null;
    mocks.refetch.mockResolvedValue({ data: pendingReport });
    mocks.mutateAsync.mockResolvedValue({ requestId: "request-1" });
    mocks.download.mockResolvedValue({
      bytes: 1_000,
      usedFallback: false,
      filename: "MyProject.pdf",
    });
  });

  it("queues generation and follows matching real progress", async () => {
    const onQueued = vi.fn();
    const { result, rerender } = renderHook(() =>
      useExportAuditReport("audit-1", { onQueued })
    );

    await act(async () => result.current.start());
    expect(mocks.mutateAsync).toHaveBeenCalledWith({ auditId: "audit-1" });
    expect(result.current.progress.phase).toBe("generating");
    expect(onQueued).toHaveBeenCalledTimes(1);

    mocks.poll.data = {
      ...pendingReport,
      reportProgress: {
        requestId: "request-1",
        step: "rendering_pdf",
        photosDone: 4,
        photosTotal: 10,
        percent: 55,
        updatedAt: "2026-09-07T12:00:00Z",
      },
    };
    rerender();

    await waitFor(() => expect(result.current.progress.percent).toBe(55));
    expect(result.current.progress.message).toBe("Rendering the PDF…");
  });

  it("ignores stale progress and uses the time estimate", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const { result, rerender } = renderHook(() =>
      useExportAuditReport("audit-1")
    );
    await act(async () => result.current.start());

    now.mockReturnValue(16_000);
    mocks.poll.data = {
      ...pendingReport,
      reportProgress: {
        requestId: "old-request",
        step: "rendering_pdf",
        photosDone: null,
        photosTotal: null,
        percent: 80,
        updatedAt: null,
      },
    };
    rerender();

    await waitFor(() => expect(result.current.progress.percent).toBe(47));
    expect(result.current.progress.message).toBe("Generating the report…");
  });

  it("downloads immediately when a valid report already exists", async () => {
    mocks.refetch.mockResolvedValue({ data: readyReport });
    const { result } = renderHook(() => useExportAuditReport("audit-1"));

    await act(async () => result.current.start());

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.download).toHaveBeenCalledWith(readyReport);
    expect(result.current.progress).toMatchObject({
      phase: "done",
      percent: 100,
      bytes: 1_000,
    });
    expect(result.current.filename).toBe("MyProject.pdf");
  });

  it("reports when the browser handles the download fallback", async () => {
    mocks.refetch.mockResolvedValue({ data: readyReport });
    mocks.download.mockResolvedValue({
      bytes: 0,
      usedFallback: true,
      filename: "MyProject.pdf",
    });
    const { result } = renderHook(() => useExportAuditReport("audit-1"));

    await act(async () => result.current.start());

    expect(result.current.progress).toMatchObject({
      phase: "done",
      message: "Download started in your browser.",
      bytes: 0,
    });
  });

  it("downloads when polling returns the URL and mirrors byte progress", async () => {
    let resolveDownload!: (value: {
      bytes: number;
      usedFallback: boolean;
      filename: string;
    }) => void;
    mocks.download.mockReturnValue(
      new Promise((resolve) => {
        resolveDownload = resolve;
      })
    );
    const { result, rerender } = renderHook(() =>
      useExportAuditReport("audit-1")
    );
    await act(async () => result.current.start());

    mocks.poll.data = readyReport;
    rerender();
    await waitFor(() => expect(result.current.progress.phase).toBe("downloading"));

    mocks.downloadState.progress = {
      receivedBytes: 50,
      totalBytes: 100,
      percent: 50,
    };
    rerender();
    await waitFor(() => expect(result.current.progress.bytes).toBe(50));
    expect(result.current.progress.percent).toBe(50);

    await act(async () => {
      resolveDownload({
        bytes: 100,
        usedFallback: false,
        filename: "MyProject.pdf",
      });
    });
    expect(result.current.progress.phase).toBe("done");
  });

  it("times out with an actionable message", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => result.current.start());

    act(() => {
      vi.advanceTimersByTime(180_000);
    });

    expect(result.current.progress.phase).toBe("timeout");
    expect(result.current.progress.message).toContain("download it later");
  });

  it("stops waiting and can close back to idle", async () => {
    const { result } = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => result.current.start());

    act(() => result.current.stopWaiting());
    expect(mocks.cancel).toHaveBeenCalled();
    expect(result.current.progress.phase).toBe("canceled");

    act(() => result.current.close());
    expect(mocks.resetDownload).toHaveBeenCalled();
    expect(result.current.progress.phase).toBe("idle");
  });

  it("surfaces queue, poll and download failures", async () => {
    mocks.mutateAsync.mockRejectedValueOnce(new Error("queue down"));
    const queue = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => queue.result.current.start());
    expect(queue.result.current.progress.phase).toBe("error");

    mocks.mutateAsync.mockResolvedValue({ requestId: "request-1" });
    const poll = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => poll.result.current.start());
    mocks.poll.isError = true;
    mocks.poll.error = new Error("poll down");
    poll.rerender();
    await waitFor(() => expect(poll.result.current.progress.phase).toBe("error"));

    mocks.poll.isError = false;
    mocks.poll.error = null;
    mocks.refetch.mockResolvedValue({ data: readyReport });
    mocks.download.mockRejectedValue(new Error("download down"));
    const download = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => download.result.current.start());
    expect(download.result.current.progress.phase).toBe("error");
  });

  it("treats an aborted download as cancellation", async () => {
    mocks.refetch.mockResolvedValue({ data: readyReport });
    mocks.download.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const { result } = renderHook(() => useExportAuditReport("audit-1"));

    await act(async () => result.current.start());
    expect(result.current.progress.phase).toBe("canceled");
  });

  it("normalizes non-Error failures from generation, polling and download", async () => {
    mocks.mutateAsync.mockRejectedValueOnce("queue down");
    const queue = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => queue.result.current.start());
    expect(queue.result.current.progress.error?.message).toBe(
      "The report could not be generated"
    );

    mocks.mutateAsync.mockResolvedValue({ requestId: "request-1" });
    const poll = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => poll.result.current.start());
    mocks.poll.isError = true;
    mocks.poll.error = "poll down" as unknown as Error;
    poll.rerender();
    await waitFor(() =>
      expect(poll.result.current.progress.error?.message).toBe(
        "The report status could not be checked"
      )
    );

    mocks.poll.isError = false;
    mocks.poll.error = null;
    mocks.refetch.mockResolvedValue({ data: readyReport });
    mocks.download.mockRejectedValue("download down");
    const download = renderHook(() => useExportAuditReport("audit-1"));
    await act(async () => download.result.current.start());
    expect(download.result.current.progress.error?.message).toBe(
      "The report could not be downloaded"
    );
  });
});
