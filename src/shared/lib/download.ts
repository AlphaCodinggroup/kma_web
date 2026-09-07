export type DownloadProgress = {
  receivedBytes: number;
  totalBytes: number | null;
  percent: number | null;
};

export class ReportDownloadError extends Error {
  constructor(
    message: string,
    public readonly canFallback = false
  ) {
    super(message);
    this.name = "ReportDownloadError";
  }
}

export class ReportTooLargeError extends Error {
  constructor(
    public readonly size: number,
    public readonly maxBytes: number
  ) {
    super(`Report size ${size} exceeds stream limit ${maxBytes}`);
    this.name = "ReportTooLargeError";
  }
}

export type StreamDownloadOptions = {
  url: string;
  filename: string;
  maxBytes: number;
  signal?: AbortSignal | undefined;
  onProgress?: ((progress: DownloadProgress) => void) | undefined;
  fetchImpl?: typeof fetch | undefined;
  doc?: Document | undefined;
  onObjectUrl?: ((url: string | null) => void) | undefined;
};

export function triggerAnchorDownload(
  url: string,
  filename: string,
  doc: Document = document
): void {
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.hidden = true;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function streamDownloadToFile({
  url,
  filename,
  maxBytes,
  signal,
  onProgress,
  fetchImpl = fetch,
  doc = document,
  onObjectUrl,
}: StreamDownloadOptions): Promise<{ bytes: number }> {
  const requestInit: RequestInit = {
    mode: "cors",
    credentials: "omit",
  };
  if (signal) requestInit.signal = signal;
  const response = await fetchImpl(url, requestInit);

  if (!response.ok) {
    throw new ReportDownloadError(
      `Report download failed with HTTP ${response.status}`
    );
  }

  const rawLength = response.headers.get("content-length");
  const parsedLength = rawLength ? Number.parseInt(rawLength, 10) : Number.NaN;
  const totalBytes =
    Number.isFinite(parsedLength) && parsedLength >= 0 ? parsedLength : null;

  if (totalBytes !== null && totalBytes > maxBytes) {
    throw new ReportTooLargeError(totalBytes, maxBytes);
  }
  if (!response.body) {
    throw new ReportDownloadError(
      "Streaming is unavailable for this response",
      true
    );
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  onProgress?.({ receivedBytes, totalBytes, percent: totalBytes ? 0 : null });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    receivedBytes += value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      throw new ReportTooLargeError(receivedBytes, maxBytes);
    }
    chunks.push(value);
    onProgress?.({
      receivedBytes,
      totalBytes,
      percent: totalBytes
        ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
        : null,
    });
  }

  const contentType =
    response.headers.get("content-type") ?? "application/pdf";
  const blobParts: BlobPart[] = chunks.map(
    (chunk) => new Uint8Array(chunk).buffer
  );
  const objectUrl = URL.createObjectURL(
    new Blob(blobParts, { type: contentType })
  );
  onObjectUrl?.(objectUrl);
  triggerAnchorDownload(objectUrl, filename, doc);
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    onObjectUrl?.(null);
  }, 0);

  return { bytes: receivedBytes };
}
