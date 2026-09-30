"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditReport } from "@entities/report/model/audit-report";
import type { ExportProgress } from "@entities/report/model/export-progress";
import { publicEnv } from "@shared/config/env";
import {
  estimateGenerationPercent,
  monotonic,
} from "@shared/lib/report-progress";
import { useAuditReport } from "@features/reports/lib/hooks/useAuditReport";
import { usePollAuditReport } from "@features/reports/lib/hooks/usePollAuditReport";
import {
  reportFileName,
  useDownloadReportFile,
} from "@features/reports/lib/hooks/useDownloadReportFile";
import { useCompleteReviewAuditMutation } from "./useCompleteReviewAuditMutation";

const initialProgress: ExportProgress = {
  phase: "idle",
  percent: null,
  message: "",
  bytes: null,
  error: null,
};

const hasDownloadUrl = (report: AuditReport | undefined) =>
  Boolean(report?.reportUrl && /^https?:\/\//.test(report.reportUrl));

export const generationMessage = (step: string | null) => {
  switch (step) {
    case "loading_audit":
    case "validating_audit":
    case "loading_project_audits":
      return "Preparing audit data…";
    case "filtering_reviews":
    case "enriching_findings":
    case "consolidating_report":
    case "formatting_report":
      return "Consolidating project findings…";
    case "rendering_pdf":
      return "Rendering the PDF…";
    case "uploading_report":
      return "Uploading the report…";
    case "finalizing_audits":
      return "Finalizing the report…";
    default:
      return "Generating the report…";
  }
};

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

type Options = {
  onQueued?: (() => void | Promise<void>) | undefined;
};

export function useExportAuditReport(auditId: string, options: Options = {}) {
  const env = publicEnv();
  const [progress, setProgress] = useState<ExportProgress>(initialProgress);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [filename, setFilename] = useState("report.pdf");
  const runRef = useRef(0);
  const startedAtRef = useRef(0);
  const downloadStartedRef = useRef(false);

  const completeReview = useCompleteReviewAuditMutation();
  const reportQuery = useAuditReport(auditId, {
    enabled: false,
    staleTime: 0,
  });
  const pollQuery = usePollAuditReport({
    auditId,
    enabled: progress.phase === "generating",
    refetchIntervalMs: env.reportPoll.intervalMs,
  });
  const {
    download,
    cancel,
    progress: downloadProgress,
    reset: resetDownload,
  } = useDownloadReportFile();

  const finishDownload = useCallback(
    async (report: AuditReport, run: number) => {
      if (downloadStartedRef.current || !hasDownloadUrl(report)) return;
      downloadStartedRef.current = true;
      const nextFilename = reportFileName(report.reportName);
      setFilename(nextFilename);
      setProgress({
        phase: "downloading",
        percent: null,
        message: "Downloading the report…",
        bytes: null,
        error: null,
      });

      try {
        const result = await download(report);
        if (runRef.current !== run) return;
        setProgress({
          phase: "done",
          percent: 100,
          message: result.usedFallback
            ? "Download started in your browser."
            : "Report downloaded.",
          bytes: result.bytes,
          error: null,
        });
      } catch (caught) {
        if (runRef.current !== run) return;
        if (isAbortError(caught)) {
          setProgress({
            phase: "canceled",
            percent: null,
            message: "Stopped waiting for the report.",
            bytes: null,
            error: null,
          });
          return;
        }
        const error =
          caught instanceof Error
            ? caught
            : new Error("The report could not be downloaded");
        setProgress({
          phase: "error",
          percent: null,
          message: "The report could not be downloaded.",
          bytes: null,
          error,
        });
      }
    },
    [download]
  );

  const start = useCallback(async () => {
    const run = ++runRef.current;
    downloadStartedRef.current = false;
    setRequestId(null);
    resetDownload();
    completeReview.reset();
    startedAtRef.current = Date.now();
    setProgress({
      phase: "queueing",
      percent: null,
      message: "Preparing the report…",
      bytes: null,
      error: null,
    });

    try {
      const current = (await reportQuery.refetch()).data;
      if (runRef.current !== run) return;
      if (current && hasDownloadUrl(current)) {
        await finishDownload(current, run);
        return;
      }

      const queued = await completeReview.mutateAsync({ auditId });
      if (runRef.current !== run) return;
      setRequestId(queued.requestId);
      setProgress({
        phase: "generating",
        percent: 5,
        message: "Generating the report…",
        bytes: null,
        error: null,
      });
      await options.onQueued?.();
    } catch (caught) {
      if (runRef.current !== run) return;
      const error =
        caught instanceof Error
          ? caught
          : new Error("The report could not be generated");
      setProgress({
        phase: "error",
        percent: null,
        message: "The report could not be generated.",
        bytes: null,
        error,
      });
    }
  }, [auditId, completeReview, finishDownload, options, reportQuery, resetDownload]);

  useEffect(() => {
    if (progress.phase !== "generating") return;
    const report = pollQuery.data;
    if (report && hasDownloadUrl(report)) {
      void finishDownload(report, runRef.current);
      return;
    }

    const realProgress =
      report?.reportProgress?.requestId === requestId
        ? report.reportProgress.percent
        : null;
    const estimated = estimateGenerationPercent(
      startedAtRef.current,
      Date.now(),
      env.reportEstimateMs
    );
    const nextPercent = realProgress ?? estimated;
    const message = generationMessage(
      report?.reportProgress?.requestId === requestId
        ? report.reportProgress.step
        : null
    );
    setProgress((current) => ({
      ...current,
      percent: monotonic(current.percent, nextPercent),
      message,
    }));
  }, [
    env.reportEstimateMs,
    finishDownload,
    pollQuery.data,
    progress.phase,
    requestId,
  ]);

  useEffect(() => {
    if (progress.phase !== "generating") return;
    const updateEstimate = () => {
      const estimated = estimateGenerationPercent(
        startedAtRef.current,
        Date.now(),
        env.reportEstimateMs
      );
      setProgress((current) => ({
        ...current,
        percent: monotonic(current.percent, estimated),
      }));
    };
    const interval = window.setInterval(
      updateEstimate,
      env.reportPoll.intervalMs
    );
    return () => window.clearInterval(interval);
  }, [env.reportEstimateMs, env.reportPoll.intervalMs, progress.phase]);

  useEffect(() => {
    if (progress.phase !== "downloading" || !downloadProgress) return;
    setProgress((current) => ({
      ...current,
      percent: monotonic(current.percent, downloadProgress.percent),
      bytes: downloadProgress.receivedBytes,
    }));
  }, [downloadProgress, progress.phase]);

  useEffect(() => {
    if (progress.phase !== "generating") return;
    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, env.reportTimeoutMs - elapsed);
    const timeout = window.setTimeout(() => {
      runRef.current++;
      setProgress({
        phase: "timeout",
        percent: null,
        message:
          "The report is still being generated. You can download it later from Reports.",
        bytes: null,
        error: null,
      });
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [env.reportTimeoutMs, progress.phase]);

  useEffect(() => {
    if (progress.phase !== "generating" || !pollQuery.isError) return;
    const error =
      pollQuery.error instanceof Error
        ? pollQuery.error
        : new Error("The report status could not be checked");
    setProgress({
      phase: "error",
      percent: null,
      message: "The report status could not be checked.",
      bytes: null,
      error,
    });
  }, [pollQuery.error, pollQuery.isError, progress.phase]);

  const stopWaiting = useCallback(() => {
    runRef.current++;
    cancel();
    setProgress({
      phase: "canceled",
      percent: null,
      message: "Stopped waiting for the report.",
      bytes: null,
      error: null,
    });
  }, [cancel]);

  const close = useCallback(() => {
    runRef.current++;
    cancel();
    resetDownload();
    setRequestId(null);
    setProgress(initialProgress);
  }, [cancel, resetDownload]);

  return {
    progress,
    filename,
    isOpen: progress.phase !== "idle",
    isBusy:
      progress.phase === "queueing" ||
      progress.phase === "generating" ||
      progress.phase === "downloading",
    start,
    retry: start,
    stopWaiting,
    close,
  };
}
