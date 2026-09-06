"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@shared/lib/cn";
import AuditEditTabsBar, { type AuditEditTab } from "./AuditEditTabsBar";
import AuditQuestionsList, { type QuestionItemVM } from "./AuditQuestionsList";
import AuditQuestionsHeader, {
  type QuestionsFilterMode,
} from "./AuditQuestionsHeader";
import ReportItemsTable from "./ReportItemsTable";
import FinalReportHeader from "./FinalReportHeader";
import CommentsSidebar from "./CommentsSidebar";
import { useAuditReviewDetail } from "../lib/hooks/useAuditReviewDetail";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import { useAuditReport } from "@features/reports/lib/hooks/useAuditReport";
import { useCompleteReviewAuditMutation } from "../lib/hooks/useCompleteReviewAuditMutation";
import { Loading } from "@shared/ui/Loading";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import AuditFindingEditDialog from "./AuditFindingEditDialog";
import { reportJobRepo } from "@features/reports/api/report-job.repo.impl";
import type { ReportJob } from "@entities/report/model/report-job";
import { AUDIT_STATUS_LABELS } from "@shared/ui/badge";

export type ReportSeverity = "high" | "medium" | "low";

export interface ReportItemVM {
  id: string;
  title: string;
  severity: ReportSeverity;
  photos?: string[];
  quantity?: number | null;
  unitPrice?: number | null;
}

export interface AuditEditContentProps {
  id: string;
  auditDetail: AuditDetail | undefined;
  isAuditDetailLoading?: boolean;
}

type CommentTarget = {
  id: string;
  title: string;
};

const POLL_INTERVAL_MS = 2000;
// El worker (SQS -> ReportsWorker) puede tardar más de 30s en generar/subir el PDF.
// Subimos el máximo para evitar que el usuario tenga que intentar 2-3 veces.
const POLL_MAX_ATTEMPTS = 60; // ~2 minutos

const AuditEditContent: React.FC<AuditEditContentProps> = ({
  id,
  auditDetail,
  isAuditDetailLoading,
}) => {
  const [internalTab, setInternalTab] = useState<AuditEditTab>("questions");
  const [internalFilter, setInternalFilter] =
    useState<QuestionsFilterMode>("all");
  const [isPollingReport, setIsPollingReport] = useState(false);
  const [reportJob, setReportJob] = useState<ReportJob | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const pollingAbort = useRef<AbortController | null>(null);

  // Estado del panel de comentarios (cuando es undefined NO se muestra)
  const [selectedCommentTarget, setSelectedCommentTarget] = useState<
    CommentTarget | undefined
  >(undefined);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(
    null
  );

  const {
    data: reviewDetail,
    isLoading,
    isError,
    refetch: refetchReviewDetail,
  } = useAuditReviewDetail(id);

  const { mutateAsync, isPending } = useCompleteReviewAuditMutation();
  const { isFetching: isFetchingReport, refetch: refetchReport } =
    useAuditReport(id, { enabled: false });

  const findings: AuditFinding[] = reviewDetail?.findings ?? [];
  const status = reviewDetail?.status;
  const hasSidebar = Boolean(selectedCommentTarget);
  const questionsToRender = useMemo(
    () => (auditDetail?.questions ?? []) as unknown as QuestionItemVM[],
    [auditDetail?.questions]
  );
  const showLoadingOverlay = isLoading || isAuditDetailLoading;
  const handleChangeTab = useCallback((tab: AuditEditTab) => {
    setInternalTab(tab);
  }, []);

  const handleFilterChange = useCallback((mode: QuestionsFilterMode) => {
    setInternalFilter(mode);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedCommentTarget(undefined);
  }, []);

  const handleOpenComments = useCallback((row: AuditFinding, index: number) => {
    const questionCode = row.questionCode?.trim();
    const barrierStatement = row.barrierStatement?.trim();
    const proposedMitigation = row.proposedMitigation?.trim();
    setSelectedCommentTarget({
      id: questionCode || `report-item-${index + 1}`,
      title:
        barrierStatement ||
        proposedMitigation ||
        `Item ${index + 1}`,
    });
  }, []);

  const handleOpenEditFinding = useCallback((row: AuditFinding) => {
    setSelectedFinding(row);
    setEditOpen(true);
  }, []);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    setEditOpen(open);
    if (!open) {
      setSelectedFinding(null);
    }
  }, []);

  const pollReportJob = useCallback(
    async (jobId: string, popup?: Window | null) => {
      pollingAbort.current?.abort();
      const controller = new AbortController();
      pollingAbort.current = controller;
      setIsPollingReport(true);

      try {
        for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
          const job = await reportJobRepo.get(jobId, controller.signal);
          setReportJob(job);

          if (job.status === "failed") {
            setReportMessage(job.errorMessage ?? "Report generation failed.");
            popup?.close();
            return;
          }
          if (job.status === "succeeded") {
            const report = await refetchReport();
            const url = report.data?.reportUrl ?? null;
            if (!url) {
              setReportMessage(
                "The job finished, but its PDF is unavailable. Retry or contact an administrator."
              );
            } else if (popup && !popup.closed) {
              popup.opener = null;
              popup.location.href = url;
            } else {
              setDownloadUrl(url);
              setReportMessage(
                "Your PDF is ready. Use the download link below."
              );
            }
            localStorage.removeItem(`report-job:${id}`);
            return;
          }

          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(resolve, POLL_INTERVAL_MS);
            controller.signal.addEventListener(
              "abort",
              () => {
                window.clearTimeout(timer);
                reject(new DOMException("Polling cancelled", "AbortError"));
              },
              { once: true }
            );
          });
        }

        setReportMessage(
          "Generation is still pending. You can resume checking without creating another job."
        );
        popup?.close();
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setReportMessage(
            error instanceof Error ? error.message : "Report generation failed."
          );
          popup?.close();
        }
      } finally {
        if (pollingAbort.current === controller) {
          pollingAbort.current = null;
          setIsPollingReport(false);
        }
      }
    },
    [id, refetchReport]
  );

  useEffect(() => {
    const storedJob = localStorage.getItem(`report-job:${id}`);
    if (storedJob) void pollReportJob(storedJob);
    return () => pollingAbort.current?.abort();
  }, [id, pollReportJob]);

  const handleExport = useCallback(async () => {
    try {
      // Abrir la pestaña inmediatamente (gesto del usuario) para evitar que el browser
      // bloquee el popup cuando el URL esté listo (porque el polling es async).
      setReportMessage(null);
      setDownloadUrl(null);
      const popup = window.open("about:blank", "_blank");
      if (popup) {
        try {
          popup.document.title = "Generating PDF...";
          popup.document.body.innerHTML =
            "<p style=\"font-family: sans-serif; padding: 16px;\">Generating PDF... please wait.</p>";
        } catch {
          // ignore: algunos browsers restringen escribir en el popup
        }
      }

      // Para que se genere el PDF, primero hay que disparar el proceso en backend.
      // El endpoint `complete-review` encola el trabajo (SQS -> ReportsWorker) y luego
      // `GET /api/reports/{id}` empieza a devolver `reportUrl` cuando esté listo.
      const result = await mutateAsync({ auditId: id });
      localStorage.setItem(`report-job:${id}`, result.jobId);
      await refetchReviewDetail(); // refresca status/datos antes de hacer polling
      await pollReportJob(result.jobId, popup);
    } catch (err) {
      setReportMessage(
        err instanceof Error ? err.message : "Report generation failed."
      );
    } finally {
      setIsPollingReport(false);
    }
  }, [id, mutateAsync, pollReportJob, refetchReviewDetail]);

  const handleRetry = useCallback(async () => {
    if (!reportJob) return;
    try {
      const job = await reportJobRepo.retry(reportJob.jobId);
      localStorage.setItem(`report-job:${id}`, job.jobId);
      setReportMessage(null);
      await pollReportJob(job.jobId);
    } catch (error) {
      setReportMessage(
        error instanceof Error ? error.message : "Report retry failed."
      );
    }
  }, [id, pollReportJob, reportJob]);

  const handleReopen = useCallback(async () => {
    const reason = window.prompt("Reason for reopening this review:")?.trim();
    if (!reason || !auditDetail?.version) return;
    try {
      const response = await fetch(
        `/api/audits-review/${encodeURIComponent(id)}/reopen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason,
            expected_version: auditDetail.version,
          }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message ?? "Failed to reopen review");
      }
      setReportMessage(null);
      await refetchReviewDetail();
    } catch (error) {
      setReportMessage(
        error instanceof Error ? error.message : "Failed to reopen review"
      );
    }
  }, [auditDetail?.version, id, refetchReviewDetail]);

  if (showLoadingOverlay) return <Loading />;

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="audit-edit-content">
      <AuditEditTabsBar activeTab={internalTab} onChangeTab={handleChangeTab} />

      {internalTab === "questions" ? (
        <>
          <AuditQuestionsHeader
            filterMode={internalFilter}
            onFilterChange={handleFilterChange}
            className="mt-2"
          />
          <AuditQuestionsList
            auditId={id}
            steps={auditDetail?.steps}
            items={questionsToRender}
            filterMode={internalFilter}
          />
        </>
      ) : (
        <section className="w-full px-4 sm:px-6 lg:px-8" aria-live="polite">
          <div className="mb-3">
            <FinalReportHeader
              onExport={handleExport}
              disabled={!findings.length || status !== "draft_report_in_review"}
              exporting={isFetchingReport || isPending || isPollingReport}
              rightAddon={
                <div className="flex items-center gap-2 text-sm">
                  <span>{status ? AUDIT_STATUS_LABELS[status] : "Unknown"}</span>
                  {status === "completed" ? (
                    <button
                      type="button"
                      onClick={() => void handleReopen()}
                      className="underline"
                    >
                      Reopen review
                    </button>
                  ) : null}
                </div>
              }
            />
            {reportMessage ? (
              <div
                role="status"
                className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900"
              >
                {reportMessage}
                {downloadUrl ? (
                  <a
                    className="ml-2 font-semibold underline"
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download PDF
                  </a>
                ) : null}
                {reportJob?.status === "failed" && reportJob.retryable ? (
                  <button
                    type="button"
                    className="ml-2 font-semibold underline"
                    onClick={() => void handleRetry()}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            ) : null}
            {reportJob ? (
              <p className="mt-2 text-xs text-gray-600">
                Includes{" "}
                {reportJob.audits
                  .map(
                    (audit) =>
                      `${audit.auditId} (audit v${audit.auditVersion}, review v${audit.reviewVersion})`
                  )
                  .join(", ")}
              </p>
            ) : null}
          </div>

          <div className={cn("flex gap-4", "flex-col md:flex-row")}>
            <div
              className={cn(
                "min-w-0 flex-1",
                hasSidebar && "md:max-h-[70vh] md:overflow-y-auto pr-1"
              )}
            >
              <ReportItemsTable
                items={findings}
                loading={isLoading}
                error={isError}
                onError={refetchReviewDetail}
                onAddComment={handleOpenComments}
                onEditFinding={handleOpenEditFinding}
              />
            </div>

            {hasSidebar && (
              <CommentsSidebar
                auditId={id}
                selected={selectedCommentTarget}
                onClose={handleCloseSidebar}
                className="md:w-[380px]"
              />
            )}
          </div>
        </section>
      )}

      <AuditFindingEditDialog
        open={editOpen}
        onOpenChange={handleEditDialogOpenChange}
        auditId={id}
        {...(reviewDetail?.version
          ? { expectedVersion: reviewDetail.version }
          : {})}
        questionCode={selectedFinding?.questionCode ?? ""}
        defaultValues={{
          quantity:
            typeof selectedFinding?.quantity === "number" &&
              Number.isFinite(selectedFinding.quantity)
              ? selectedFinding.quantity
              : null,
          notes: selectedFinding?.notes ?? null,
        }}
      />
    </div>
  );
};

export default AuditEditContent;
