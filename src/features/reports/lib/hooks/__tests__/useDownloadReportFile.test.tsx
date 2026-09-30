import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReportDownloadError,
  ReportTooLargeError,
  type StreamDownloadOptions,
} from "@shared/lib/download";
import {
  reportFileName,
  useDownloadReportFile,
} from "../useDownloadReportFile";

vi.mock("@shared/config/env", () => ({
  publicEnv: () => ({
    reportDownloadMode: "stream",
    reportStreamMaxBytes: 200,
  }),
}));

const report = {
  id: "audit-1",
  reportName: "My Project",
  reportUrl: "https://files.test/report.pdf",
};

describe("reportFileName", () => {
  it.each([
    ["My Project", "MyProject.pdf"],
    ["", "report.pdf"],
    [null, "report.pdf"],
  ])("sanitizes %s", (name, expected) => {
    expect(reportFileName(name)).toBe(expected);
  });
});

describe("useDownloadReportFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams a report and exposes byte progress", async () => {
    const streamDownload = vi.fn(
      async (options: StreamDownloadOptions) => {
        options.onProgress?.({
          receivedBytes: 50,
          totalBytes: 100,
          percent: 50,
        });
        return { bytes: 100 };
      }
    );
    const { result } = renderHook(() =>
      useDownloadReportFile({ streamDownload })
    );

    let value;
    await act(async () => {
      value = await result.current.download(report);
    });

    expect(value).toEqual({
      bytes: 100,
      usedFallback: false,
      filename: "MyProject.pdf",
    });
    expect(result.current.progress?.percent).toBe(50);
    expect(result.current.activeId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it.each([
    new ReportTooLargeError(300, 200),
    new TypeError("CORS"),
    new ReportDownloadError("no stream", true),
  ])("falls back to an anchor for %s", async (streamError) => {
    const anchorDownload = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useDownloadReportFile({
        streamDownload: vi.fn().mockRejectedValue(streamError),
        anchorDownload,
      })
    );

    await expect(
      act(async () => result.current.download(report))
    ).resolves.toEqual(
      expect.objectContaining({ bytes: null, usedFallback: true })
    );
    expect(anchorDownload).toHaveBeenCalledWith(
      report.reportUrl,
      "MyProject.pdf"
    );
  });

  it("uses anchor mode without attempting to stream", async () => {
    const anchorDownload = vi.fn();
    const streamDownload = vi.fn();
    const { result } = renderHook(() =>
      useDownloadReportFile({
        mode: "anchor",
        anchorDownload,
        streamDownload,
      })
    );

    await act(async () => {
      await result.current.download(report);
    });

    expect(anchorDownload).toHaveBeenCalled();
    expect(streamDownload).not.toHaveBeenCalled();
  });

  it("surfaces non-fallback download errors and resets them", async () => {
    const failure = new ReportDownloadError("HTTP 500");
    const { result } = renderHook(() =>
      useDownloadReportFile({
        streamDownload: vi.fn().mockRejectedValue(failure),
      })
    );

    await act(async () => {
      await expect(result.current.download(report)).rejects.toBe(failure);
    });
    expect(result.current.error).toBe(failure);

    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBeNull();
  });

  it("rejects an invalid URL before starting", async () => {
    const { result } = renderHook(() => useDownloadReportFile());

    await act(async () => {
      await expect(
        result.current.download({ ...report, reportUrl: "/relative.pdf" })
      ).rejects.toBeInstanceOf(ReportDownloadError);
    });

    expect(result.current.activeId).toBeNull();
    expect(result.current.error).toBeInstanceOf(ReportDownloadError);
  });

  it("aborts an in-flight stream without anchor fallback", async () => {
    const anchorDownload = vi.fn();
    const streamDownload = vi.fn(
      (options: StreamDownloadOptions) =>
        new Promise<{ bytes: number }>((_resolve, reject) => {
          options.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );
    const { result } = renderHook(() =>
      useDownloadReportFile({ streamDownload, anchorDownload })
    );

    let downloadPromise!: Promise<unknown>;
    act(() => {
      downloadPromise = result.current.download(report);
      void downloadPromise.catch(() => undefined);
    });
    await waitFor(() => expect(result.current.activeId).toBe("audit-1"));
    act(() => result.current.cancel());

    await expect(downloadPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(anchorDownload).not.toHaveBeenCalled();
    expect(result.current.activeId).toBeNull();
  });

  it("aborts and revokes a pending object URL on unmount", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const streamDownload = vi.fn(
      (options: StreamDownloadOptions) =>
        new Promise<{ bytes: number }>((_resolve, reject) => {
          options.onObjectUrl?.("blob:pending");
          options.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );
    const { result, unmount } = renderHook(() =>
      useDownloadReportFile({ streamDownload })
    );

    act(() => {
      void result.current.download(report).catch(() => undefined);
    });
    unmount();

    expect(revoke).toHaveBeenCalledWith("blob:pending");
  });
});
