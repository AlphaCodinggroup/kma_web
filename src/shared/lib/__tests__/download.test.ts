import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReportDownloadError,
  ReportTooLargeError,
  streamDownloadToFile,
  triggerAnchorDownload,
  type DownloadProgress,
} from "../download";

type ReaderStep = ReadableStreamReadResult<Uint8Array>;

function response(options: {
  ok?: boolean;
  status?: number;
  length?: string | null;
  contentType?: string | null;
  steps?: ReaderStep[];
  body?: boolean;
  cancel?: ReturnType<typeof vi.fn>;
}) {
  const steps = [...(options.steps ?? [{ done: true, value: undefined }])];
  const cancel = options.cancel ?? vi.fn().mockResolvedValue(undefined);
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers: {
      get: (name: string) => {
        if (name === "content-length") return options.length ?? null;
        if (name === "content-type") return options.contentType ?? null;
        return null;
      },
    },
    body:
      options.body === false
        ? null
        : {
            getReader: () => ({
              read: vi.fn(async () => steps.shift() ?? { done: true }),
              cancel,
            }),
          },
  } as unknown as Response;
}

describe("triggerAnchorDownload", () => {
  it("clicks and removes a hidden download anchor", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    triggerAnchorDownload("https://files.test/report.pdf", "report.pdf");

    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("report.pdf");
    expect(anchor.rel).toBe("noopener");
    expect(anchor.hidden).toBe(true);
    expect(anchor.isConnected).toBe(false);
  });
});

describe("streamDownloadToFile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("streams bytes, reports percentage and revokes the object URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response({
        length: "4",
        contentType: "application/pdf",
        steps: [
          { done: false, value: new Uint8Array([1, 2]) },
          { done: false, value: new Uint8Array([3, 4]) },
          { done: true, value: undefined },
        ],
      })
    );
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:report");
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const progress: DownloadProgress[] = [];
    const onObjectUrl = vi.fn();

    await expect(
      streamDownloadToFile({
        url: "https://files.test/report.pdf",
        filename: "report.pdf",
        maxBytes: 10,
        fetchImpl,
        onProgress: (value) => progress.push(value),
        onObjectUrl,
      })
    ).resolves.toEqual({ bytes: 4 });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://files.test/report.pdf",
      expect.objectContaining({ mode: "cors", credentials: "omit" })
    );
    expect(progress).toEqual([
      { receivedBytes: 0, totalBytes: 4, percent: 0 },
      { receivedBytes: 2, totalBytes: 4, percent: 50 },
      { receivedBytes: 4, totalBytes: 4, percent: 100 },
    ]);
    expect(create).toHaveBeenCalled();
    expect(onObjectUrl).toHaveBeenCalledWith("blob:report");

    await vi.runAllTimersAsync();
    expect(revoke).toHaveBeenCalledWith("blob:report");
    expect(onObjectUrl).toHaveBeenLastCalledWith(null);
  });

  it("reports indeterminate progress without content-length", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:report");
    const progress: DownloadProgress[] = [];
    await streamDownloadToFile({
      url: "https://files.test/report.pdf",
      filename: "report.pdf",
      maxBytes: 10,
      fetchImpl: vi.fn().mockResolvedValue(
        response({
          steps: [
            { done: false, value: undefined } as unknown as ReaderStep,
            { done: false, value: new Uint8Array([1]) },
            { done: true, value: undefined },
          ],
        })
      ),
      onProgress: (value) => progress.push(value),
    });

    expect(progress.at(-1)?.percent).toBeNull();
  });

  it("rejects HTTP errors without allowing fallback", async () => {
    await expect(
      streamDownloadToFile({
        url: "https://files.test/report.pdf",
        filename: "report.pdf",
        maxBytes: 10,
        fetchImpl: vi.fn().mockResolvedValue(response({ ok: false, status: 503 })),
      })
    ).rejects.toMatchObject({
      name: "ReportDownloadError",
      canFallback: false,
    });
  });

  it("rejects a known oversized response before reading", async () => {
    await expect(
      streamDownloadToFile({
        url: "https://files.test/report.pdf",
        filename: "report.pdf",
        maxBytes: 3,
        fetchImpl: vi.fn().mockResolvedValue(response({ length: "4" })),
      })
    ).rejects.toBeInstanceOf(ReportTooLargeError);
  });

  it("cancels when an unknown-length response crosses the limit", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    await expect(
      streamDownloadToFile({
        url: "https://files.test/report.pdf",
        filename: "report.pdf",
        maxBytes: 1,
        fetchImpl: vi.fn().mockResolvedValue(
          response({
            cancel,
            steps: [
              { done: false, value: new Uint8Array([1, 2]) },
              { done: true, value: undefined },
            ],
          })
        ),
      })
    ).rejects.toBeInstanceOf(ReportTooLargeError);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("marks a missing stream as eligible for anchor fallback", async () => {
    await expect(
      streamDownloadToFile({
        url: "https://files.test/report.pdf",
        filename: "report.pdf",
        maxBytes: 10,
        fetchImpl: vi.fn().mockResolvedValue(response({ body: false })),
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReportDownloadError>>({
        canFallback: true,
      })
    );
  });

  it("passes an AbortSignal to fetch", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn().mockRejectedValue(
      new DOMException("Aborted", "AbortError")
    );
    controller.abort();

    await expect(
      streamDownloadToFile({
        url: "https://files.test/report.pdf",
        filename: "report.pdf",
        maxBytes: 10,
        signal: controller.signal,
        fetchImpl,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      signal: controller.signal,
    });
  });
});
