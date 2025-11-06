"use client";

import React, { useMemo, useState } from "react";
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

  activeTab?: AuditEditTab;
  defaultTab?: AuditEditTab;
  onChangeTab?: (tab: AuditEditTab) => void;

  // preguntas
  filterMode?: QuestionsFilterMode;
  defaultFilterMode?: QuestionsFilterMode;
  onToggleFilter?: () => void;

  // reporte
  onExportPdf?: (() => void) | undefined;

  className?: string;
}

const AuditEditContent: React.FC<AuditEditContentProps> = ({
  id,
  questions,
  activeTab,
  defaultTab = "questions",
  onChangeTab,

  filterMode,
  defaultFilterMode = "no",
  onToggleFilter,

  onExportPdf,
  className,
}) => {
  const [internalTab, setInternalTab] = useState<AuditEditTab>(defaultTab);
  const [internalFilter, setInternalFilter] =
    useState<QuestionsFilterMode>(defaultFilterMode);

  // Estado del panel de comentarios (cuando es undefined NO se muestra)
  const [selectedCommentTarget, setSelectedCommentTarget] = useState<
    { id: string; title: string } | undefined
  >(undefined);

  const { data, isLoading, isError, refetch } = useAuditReviewDetail(id);

  console.log({ data });

  const tab = activeTab ?? internalTab;
  const qFilter = filterMode ?? internalFilter;
  const hasSidebar = !!selectedCommentTarget;

  const handleChangeTab = (t: AuditEditTab) =>
    onChangeTab ? onChangeTab(t) : setInternalTab(t);

  const handleToggleFilter = () =>
    onToggleFilter
      ? onToggleFilter()
      : setInternalFilter((prev) => (prev === "no" ? "all" : "no"));

  const rows = useMemo<AuditFinding[]>(() => {
    if (!data?.findings) return [];
    return data.findings;
  }, [data]);

  return (
    <div
      className={cn("space-y-4 sm:space-y-5", className)}
      data-testid="audit-edit-content"
    >
      <AuditEditTabsBar activeTab={tab} onChangeTab={handleChangeTab} />

      {tab === "questions" ? (
        <>
          <AuditQuestionsHeader
            filterMode={qFilter}
            onToggleFilter={handleToggleFilter}
            className="mt-2"
          />
          <AuditQuestionsList items={questions} filterMode={qFilter} />
        </>
      ) : (
        <section className="w-full px-4 sm:px-6 lg:px-8" aria-live="polite">
          <FinalReportHeader onExport={onExportPdf} className="mb-3" />

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
