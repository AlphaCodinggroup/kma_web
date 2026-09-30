"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditReport } from "@entities/report/model/audit-report";
import {
  ReportDownloadError,
  ReportTooLargeError,
  streamDownloadToFile,
  triggerAnchorDownload,
  type DownloadProgress,
  type StreamDownloadOptions,
} from "@shared/lib/download";
import { sanitizeFileName } from "@shared/lib/file";
import { publicEnv } from "@shared/config/env";

type DownloadableReport = Pick<
  AuditReport,
  "id" | "reportName" | "reportUrl"
>;

type DownloadResult = {
  bytes: number | null;
  usedFallback: boolean;
  filename: string;
};

type Options = {
  mode?: "stream" | "anchor" | undefined;
  maxBytes?: number | undefined;
  streamDownload?: typeof streamDownloadToFile | undefined;
  anchorDownload?: typeof triggerAnchorDownload | undefined;
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";

const canFallback = (error: unknown) =>
  error instanceof ReportTooLargeError ||
  error instanceof TypeError ||
  (error instanceof ReportDownloadError && error.canFallback);

export function reportFileName(reportName: string | null): string {
  const base = sanitizeFileName(reportName ?? "") || "report";
  return `${base}.pdf`;
}

export function useDownloadReportFile(options: Options = {}) {
  const env = publicEnv();
  const mode = options.mode ?? env.reportDownloadMode;
  const maxBytes = options.maxBytes ?? env.reportStreamMaxBytes;
  const streamDownload = options.streamDownload ?? streamDownloadToFile;
  const anchorDownload = options.anchorDownload ?? triggerAnchorDownload;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setActiveId(null);
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setError(null);
  }, []);

  const download = useCallback(
    async (report: DownloadableReport): Promise<DownloadResult> => {
      const url = report.reportUrl;
      const filename = reportFileName(report.reportName);
      if (!url || !/^https?:\/\//.test(url)) {
        const invalidUrlError = new ReportDownloadError(
          "The report download URL is not available"
        );
        setError(invalidUrlError);
        throw invalidUrlError;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setActiveId(report.id);
      setProgress(null);
      setError(null);

      try {
        if (mode === "anchor") {
          anchorDownload(url, filename);
          return { bytes: null, usedFallback: true, filename };
        }

        const streamOptions: StreamDownloadOptions = {
          url,
          filename,
          maxBytes,
          signal: controller.signal,
          onProgress: (nextProgress) => {
            if (mountedRef.current) setProgress(nextProgress);
          },
          onObjectUrl: (objectUrl) => {
            objectUrlRef.current = objectUrl;
          },
        };
        const result = await streamDownload(streamOptions);
        return { bytes: result.bytes, usedFallback: false, filename };
      } catch (caught) {
        if (isAbortError(caught)) {
          throw caught;
        }
        if (canFallback(caught)) {
          console.warn(
            "[ReportDownload] Streaming unavailable; using browser download.",
            caught
          );
          anchorDownload(url, filename);
          return { bytes: null, usedFallback: true, filename };
        }

        const downloadError =
          caught instanceof Error
            ? caught
            : new ReportDownloadError("The report could not be downloaded");
        if (mountedRef.current) setError(downloadError);
        throw downloadError;
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          if (mountedRef.current) setActiveId(null);
        }
      }
    },
    [anchorDownload, maxBytes, mode, streamDownload]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return { download, cancel, activeId, progress, error, reset };
}
