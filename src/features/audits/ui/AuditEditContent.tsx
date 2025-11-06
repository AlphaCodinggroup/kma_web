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
  questions: QuestionItemVM[];
}

const AuditEditContent: React.FC<AuditEditContentProps> = ({
  id,
  questions,
}) => {
  const [internalTab, setInternalTab] = useState<AuditEditTab>("questions");
  const [internalFilter, setInternalFilter] =
    useState<QuestionsFilterMode>("no");

  // Estado del panel de comentarios (cuando es undefined NO se muestra)
  const [selectedCommentTarget, setSelectedCommentTarget] = useState<
    { id: string; title: string } | undefined
  >(undefined);

  const { data, isLoading, isError, refetch } = useAuditReviewDetail(id);

  const {
    data: report,
    isFetching: isFetchingReport,
    refetch: refetchReport,
  } = useAuditReport(id, { enabled: false });

  const hasSidebar = !!selectedCommentTarget;

  const handleChangeTab = (t: AuditEditTab) => setInternalTab(t);

  const handleToggleFilter = () =>
    setInternalFilter((prev) => (prev === "no" ? "all" : "no"));

  const rows = useMemo<AuditFinding[]>(() => {
    if (!data?.findings) return [];
    return data.findings;
  }, [data]);

  const handleExport = useCallback(async () => {
    const res = await refetchReport();
    // priorizamos el dato fresco (res.data); caemos al cacheado si no llegó
    const url = res.data?.reportUrl ?? report?.reportUrl ?? null;

    if (url && /^https?:\/\//.test(url)) {
      // noopener/noreferrer por seguridad
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // Silencioso por ahora (sin UI extra). Podrías agregar un toast si tenés uno.
      console.warn("[FinalReport] No reportUrl available yet.");
    }
  }, [refetchReport, report]);

  return (
    <div className={"space-y-4 sm:space-y-5"} data-testid="audit-edit-content">
      <AuditEditTabsBar activeTab={internalTab} onChangeTab={handleChangeTab} />

      {internalTab === "questions" ? (
        <>
          <AuditQuestionsHeader
            filterMode={internalFilter}
            onToggleFilter={handleToggleFilter}
            className="mt-2"
          />
          <AuditQuestionsList items={questions} filterMode={internalFilter} />
        </>
      ) : (
        <section className="w-full px-4 sm:px-6 lg:px-8" aria-live="polite">
          <FinalReportHeader
            onExport={handleExport}
            exporting={isFetchingReport}
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
                items={rows}
                loading={isLoading}
                error={isError}
                onError={refetch}
                // onAddComment={(row) => {
                //   setSelectedCommentTarget({
                //     id: row.id,
                //     title:
                //       (row as any).barrierStatement ??
                //       (row as any).title ??
                //       "Selected item",
                //   });
                // }}
              />
            </div>

            {hasSidebar && (
              <CommentsSidebar
                selected={selectedCommentTarget}
                onClose={() => setSelectedCommentTarget(undefined)}
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
