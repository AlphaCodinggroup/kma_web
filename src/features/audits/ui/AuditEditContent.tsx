"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Loading } from "@shared/ui/Loading";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import type { AuditStatus } from "@entities/audit/model";
import { useUpdateAuditReviewStatus } from "../lib/hooks/useUpdateAuditReviewStatus";
import AuditStatusSelector from "./AuditStatusSelector";
import AuditFindingEditDialog from "./AuditFindingEditDialog";
import ExportReportModal from "./ExportReportModal";
import { useExportAuditReport } from "../lib/hooks/useExportAuditReport";

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

const AuditEditContent: React.FC<AuditEditContentProps> = ({
  id,
  auditDetail,
  isAuditDetailLoading,
}) => {
  const [internalTab, setInternalTab] = useState<AuditEditTab>("questions");
  const [internalFilter, setInternalFilter] =
    useState<QuestionsFilterMode>("all");

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

  const { mutate: mutateStatus, isPending: isUpdatingStatus } =
    useUpdateAuditReviewStatus();
  const refreshAfterQueue = useCallback(async () => {
    await refetchReviewDetail();
  }, [refetchReviewDetail]);
  const exportReport = useExportAuditReport(id, {
    onQueued: refreshAfterQueue,
  });

  const findings: AuditFinding[] = reviewDetail?.findings ?? [];
  const status = reviewDetail?.status;
  const hasSidebar = Boolean(selectedCommentTarget);
  const questionsToRender = useMemo(
    () => (auditDetail?.questions ?? []) as unknown as QuestionItemVM[],
    [auditDetail?.questions]
  );
  const showLoadingOverlay = isLoading || isAuditDetailLoading;
  const [selectedStatus, setSelectedStatus] = useState<AuditStatus | undefined>(
    status
  );

  useEffect(() => {
    if (status) {
      setSelectedStatus(status);
    }
  }, [status]);

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

  const handleChangeStatus = useCallback(
    (next: AuditStatus) => {
      if (!id || !status) return;
      const previous = selectedStatus ?? status;
      setSelectedStatus(next);
      mutateStatus(
        { auditId: id, status: next },
        {
          onError: () => setSelectedStatus(previous),
        }
      );
    },
    [id, mutateStatus, selectedStatus, status]
  );

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
          <div className="mb-3">
            <FinalReportHeader
              onExport={exportReport.start}
              disabled={!findings.length}
              exporting={exportReport.isBusy}
              loadingLabel={
                exportReport.progress.percent === null
                  ? exportReport.progress.message
                  : `${exportReport.progress.message} ${exportReport.progress.percent}%`
              }
              rightAddon={
                <AuditStatusSelector
                  value={selectedStatus}
                  onChange={handleChangeStatus}
                  disabled={!status || isLoading || isAuditDetailLoading}
                  isLoading={isUpdatingStatus}
                />
              }
            />
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
      <ExportReportModal
        open={exportReport.isOpen}
        progress={exportReport.progress}
        filename={exportReport.filename}
        onStop={exportReport.stopWaiting}
        onRetry={exportReport.retry}
        onClose={exportReport.close}
      />
    </div>
  );
};

export default AuditEditContent;
