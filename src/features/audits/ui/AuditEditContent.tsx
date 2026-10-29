"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@shared/lib/cn";
import { useMediaQuery } from "@shared/lib/useMediaQuery";
import { Modal, ModalContent, ModalTitle } from "@shared/ui/modal";
import { useUrlParameter } from "@shared/lib/useUrlParameter";
import AuditEditTabsBar, { type AuditEditTab } from "./AuditEditTabsBar";
import AuditQuestionsList, { type QuestionItemVM } from "./AuditQuestionsList";
import AuditQuestionsHeader, {
  type QuestionsFilterMode,
} from "./AuditQuestionsHeader";
import ReportPreview from "./ReportPreview";
import ReportActionBar from "./ReportActionBar";
import FinalReportHeader from "./FinalReportHeader";
import CommentsSidebar from "./CommentsSidebar";
import { useAuditReviewDetail } from "../lib/hooks/useAuditReviewDetail";
import { auditDetailKey } from "../lib/hooks/useAuditDetail";
import { useReportDrafts } from "../lib/hooks/useReportDrafts";
import { resolveAuditEvidence } from "../lib/resolve-audit-evidence";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import ExportReportModal from "./ExportReportModal";
import { useExportAuditReport } from "../lib/hooks/useExportAuditReport";
import { useAuditReport } from "@features/reports/lib/hooks/useAuditReport";
import { useDownloadReportFile } from "@features/reports/lib/hooks/useDownloadReportFile";
import { useSession } from "@processes/auth/hooks";

export interface AuditEditContentProps {
  id: string;
  auditDetail: AuditDetail | undefined;
  isAuditDetailLoading?: boolean;
  /** Avisa si la vista previa tiene cambios sin guardar. */
  onDirtyChange?: ((dirty: boolean) => void) | undefined;
}

type CommentTarget = {
  id: string;
  title: string;
};

// Estados en los que ya existe el PDF del proyecto.
const REPORTED_STATUSES = new Set(["final_report_sent_to_client", "completed"]);

const hasDownloadUrl = (url: string | null | undefined) =>
  Boolean(url && /^https?:\/\//.test(url));

const AuditEditContent: React.FC<AuditEditContentProps> = ({
  id,
  auditDetail,
  isAuditDetailLoading,
  onDirtyChange,
}) => {
  const queryClient = useQueryClient();
  const { isAdmin } = useSession();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [tabValue, setInternalTab] = useUrlParameter("view", "questions");
  const internalTab: AuditEditTab = tabValue === "report" ? "report" : "questions";
  const [filterValue, setInternalFilter] = useUrlParameter("answer", "all");
  const internalFilter: QuestionsFilterMode = ["yes", "no", "unsure"].includes(filterValue) ? filterValue as QuestionsFilterMode : "all";

  // Estado del panel de comentarios (cuando es undefined NO se muestra)
  const [selectedCommentTarget, setSelectedCommentTarget] = useState<
    CommentTarget | undefined
  >(undefined);

  const {
    data: reviewDetail,
    isLoading,
    isError,
    refetch: refetchReviewDetail,
  } = useAuditReviewDetail(id);

  const findings: AuditFinding[] = useMemo(
    () => reviewDetail?.findings ?? [],
    [reviewDetail?.findings]
  );
  const status = reviewDetail?.status;
  // Sólo un admin edita, y sólo con la auditoría en revisión (lo exige el backend).
  const editable = isAdmin && status === "draft_report_in_review";
  const drafts = useReportDrafts(id, findings);

  useEffect(() => {
    onDirtyChange?.(drafts.isDirty);
  }, [drafts.isDirty, onDirtyChange]);

  // ---- Approve: aprueba y genera el PDF, sin descargarlo ----
  const refreshAfterQueue = useCallback(async () => {
    await refetchReviewDetail();
  }, [refetchReviewDetail]);
  const approveFlow = useExportAuditReport(id, {
    onQueued: refreshAfterQueue,
    downloadWhenReady: false,
  });
  const approved = approveFlow.progress.phase === "done";

  // ---- Download: el PDF del proyecto, una vez aprobado ----
  const reportEnabled = Boolean(status && REPORTED_STATUSES.has(status)) || approved;
  const { data: report } = useAuditReport(id, { enabled: reportEnabled });
  const { download, activeId: downloadingId } = useDownloadReportFile();
  const canDownload = hasDownloadUrl(report?.reportUrl);

  useEffect(() => {
    if (!approved) return;
    // El estado y el PDF cambian del lado del backend: se vuelven a leer.
    void refetchReviewDetail();
    void queryClient.invalidateQueries({ queryKey: auditDetailKey(id) });
    void queryClient.invalidateQueries({ queryKey: ["reports", "by-audit", id] });
  }, [approved, id, queryClient, refetchReviewDetail]);

  const handleDownload = useCallback(() => {
    if (!report) return;
    setDownloadError(null);
    void download(report).catch((error: unknown) => {
      console.error("[AuditEditContent] Error downloading report:", error);
      setDownloadError("Error downloading the report. Please try again.");
    });
  }, [download, report]);

  const hasSidebar = Boolean(selectedCommentTarget);
  const compact = useMediaQuery("(max-width: 1023px)");
  const questionsToRender = useMemo(
    () => resolveAuditEvidence(auditDetail?.questions ?? [], findings) as unknown as QuestionItemVM[],
    [auditDetail?.questions, findings]
  );
  const showLoadingOverlay = isLoading || isAuditDetailLoading;

  const handleChangeTab = useCallback((tab: AuditEditTab) => {
    setInternalTab(tab);
  }, [setInternalTab]);

  const handleFilterChange = useCallback((mode: QuestionsFilterMode) => {
    setInternalFilter(mode);
  }, [setInternalFilter]);

  const handleCloseSidebar = useCallback(() => {
    setSelectedCommentTarget(undefined);
  }, []);

  const handleOpenComments = useCallback((row: AuditFinding, index: number) => {
    setSelectedCommentTarget({
      id: row.questionCode ?? `report-item-${index + 1}`,
      title:
        row.barrierStatement ??
        row.proposedMitigation ??
        `Item ${index + 1}`,
    });
  }, []);

  if (showLoadingOverlay) return <Loading />;

  return (
    <div className="space-y-6" data-testid="audit-edit-content">
      <AuditEditTabsBar activeTab={internalTab} onChangeTab={handleChangeTab} />

      <div id="audit-questions-panel" role="tabpanel" aria-labelledby="audit-questions-tab" hidden={internalTab !== "questions"} tabIndex={0}>
        {internalTab === "questions" && (<>
          <AuditQuestionsHeader
            filterMode={internalFilter}
            onFilterChange={handleFilterChange}
            className="mb-4"
          />
          <AuditQuestionsList
            auditId={id}
            steps={auditDetail?.steps}
            items={questionsToRender}
            filterMode={internalFilter}
          />
        </>)}
      </div>
      <div id="audit-report-panel" role="tabpanel" aria-labelledby="audit-report-tab" hidden={internalTab !== "report"} tabIndex={0}>
        {internalTab === "report" && (<section className="w-full px-4 sm:px-6 lg:px-8">
          <FinalReportHeader className="mb-4" />

          {isError ? (
            <Retry
              text="The report could not be loaded."
              onClick={() => void refetchReviewDetail()}
            />
          ) : (
            <div className="flex flex-col items-start overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-bg)] lg:flex-row">
              <div
                className={cn(
                  "w-full min-w-0 flex-1 p-3 sm:p-6 lg:p-8",
                  hasSidebar && !compact && "lg:max-h-[75vh] lg:overflow-y-auto"
                )}
              >
                <ReportPreview
                  findings={findings}
                  facilityName={auditDetail?.facilityName ?? "Facility"}
                  location={auditDetail?.location}
                  editable={editable}
                  drafts={drafts}
                  canComment={isAdmin}
                  onAddComment={handleOpenComments}
                />
              </div>

              {hasSidebar && !compact && (
                <CommentsSidebar
                  auditId={id}
                  selected={selectedCommentTarget}
                  onClose={handleCloseSidebar}
                  className="lg:w-[320px] lg:self-stretch"
                />
              )}
            </div>
          )}

          {downloadError && <p role="alert" className="mt-3 rounded-lg bg-[var(--kma-danger-bg)] p-3 text-sm text-[var(--kma-danger)]">{downloadError}</p>}
          <ReportActionBar
            isDirty={drafts.isDirty}
            hasErrors={drafts.hasErrors}
            isSaving={drafts.isSaving}
            saveError={drafts.saveError}
            onSave={() => void drafts.save()}
            onDiscard={drafts.discard}
            canApprove={editable && findings.length > 0}
            approving={approveFlow.isBusy}
            onApprove={() => void approveFlow.start()}
            canDownload={canDownload}
            downloading={Boolean(report) && downloadingId === report?.id}
            onDownload={handleDownload}
          />
        </section>)}
      </div>

      {compact && hasSidebar && <Modal open={hasSidebar} onOpenChange={open => { if (!open) handleCloseSidebar(); }} className="!justify-end !p-0">
        <ModalContent className="!h-dvh !max-h-dvh !max-w-md !rounded-none !p-0">
          <ModalTitle className="sr-only">Finding comments</ModalTitle>
          <CommentsSidebar auditId={id} selected={selectedCommentTarget} onClose={handleCloseSidebar} className="min-h-dvh border-0" />
        </ModalContent>
      </Modal>}

      <ExportReportModal
        open={approveFlow.isOpen}
        progress={approveFlow.progress}
        filename={approveFlow.filename}
        onStop={approveFlow.stopWaiting}
        onRetry={approveFlow.retry}
        onClose={approveFlow.close}
        activeTitle="Approving report"
        showFilename={false}
      />
    </div>
  );
};

export default AuditEditContent;
