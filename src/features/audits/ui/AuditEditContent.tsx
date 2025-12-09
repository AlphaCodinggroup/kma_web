"use client";

import React, { useCallback, useMemo, useState } from "react";
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
const POLL_MAX_ATTEMPTS = 15; // ~30 segundos

const AuditEditContent: React.FC<AuditEditContentProps> = ({
  id,
  auditDetail,
  isAuditDetailLoading,
}) => {
  const [internalTab, setInternalTab] = useState<AuditEditTab>("questions");
  const [internalFilter, setInternalFilter] =
    useState<QuestionsFilterMode>("no");
  const [isPollingReport, setIsPollingReport] = useState(false);

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

  const handleToggleFilter = useCallback(() => {
    setInternalFilter((prev) => (prev === "no" ? "all" : "no"));
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

  const handleExport = useCallback(async () => {
    try {
      // Si está en revisión, cerramos la revisión primero
      if (status === "draft_report_in_review") {
        await mutateAsync({ auditId: id });
        await refetchReviewDetail(); // refresca detalle para que status cambie
      }

      // Empezamos el polling del reporte
      setIsPollingReport(true);

      let finalUrl: string | null = null;

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        const res = await refetchReport();

        if (res.error) {
          console.error("[FinalReport] Error fetching report:", res.error);
          break;
        }

        const currentUrl = res.data?.reportUrl ?? null;

        if (currentUrl && /^https?:\/\//.test(currentUrl)) {
          finalUrl = currentUrl;
          break; // tenemos URL válida, salimos del loop
        }

        // Seguimos esperando: 2s más
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      if (finalUrl) {
        window.open(finalUrl, "_blank", "noopener,noreferrer");
      } else {
        console.warn(
          "[FinalReport] No reportUrl available after polling attempts."
        );
      }
    } catch (err) {
      console.error("[FinalReport] Error al exportar reporte:", err);
    } finally {
      setIsPollingReport(false);
    }
  }, [id, status, mutateAsync, refetchReviewDetail, refetchReport]);

  if (showLoadingOverlay) return <Loading />;

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="audit-edit-content">
      <AuditEditTabsBar activeTab={internalTab} onChangeTab={handleChangeTab} />

      {internalTab === "questions" ? (
        <>
          <AuditQuestionsHeader
            filterMode={internalFilter}
            onToggleFilter={handleToggleFilter}
            className="mt-2"
          />
          <AuditQuestionsList
            items={questionsToRender}
            filterMode={internalFilter}
          />
        </>
      ) : (
        <section className="w-full px-4 sm:px-6 lg:px-8" aria-live="polite">
          <FinalReportHeader
            onExport={handleExport}
            disabled={!findings.length}
            exporting={isFetchingReport || isPending || isPollingReport}
            className="mb-3"
          />

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
    </div>
  );
};

export default AuditEditContent;
