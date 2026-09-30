"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@shared/lib/cn";
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
  const [internalTab, setInternalTab] = useState<AuditEditTab>("questions");
  const [internalFilter, setInternalFilter] =
    useState<QuestionsFilterMode>("all");

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
    void download(report).catch((error: unknown) => {
      console.error("[AuditEditContent] Error downloading report:", error);
      alert("Error downloading the report. Please try again.");
    });
  }, [download, report]);

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
        <section className="w-full px-4 sm:px-6 lg:px-8">
          <FinalReportHeader className="mb-3" />

          {isError ? (
            <Retry
              text="The report could not be loaded."
              onClick={() => void refetchReviewDetail()}
            />
          ) : (
            <div className={cn("flex gap-4", "flex-col md:flex-row")}>
              <div
                className={cn(
                  "min-w-0 flex-1",
                  hasSidebar && "md:max-h-[70vh] md:overflow-y-auto pr-1"
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

              {hasSidebar && (
                <CommentsSidebar
                  auditId={id}
                  selected={selectedCommentTarget}
                  onClose={handleCloseSidebar}
                  className="md:w-[380px]"
                />
              )}
            </div>
          )}

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
        </section>
      )}

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
