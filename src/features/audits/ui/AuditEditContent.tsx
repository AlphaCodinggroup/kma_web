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
  questions: QuestionItemVM[];
  reportItems?: ReportItemVM[];
  activeTab?: AuditEditTab;
  defaultTab?: AuditEditTab;
  onChangeTab?: (tab: AuditEditTab) => void;
  filterMode?: QuestionsFilterMode;
  defaultFilterMode?: QuestionsFilterMode;
  onToggleFilter?: () => void;
  onExportPdf?: () => void;
  formatCurrency?: (n: number) => string;

  className?: string;
}

const AuditEditContent: React.FC<AuditEditContentProps> = ({
  questions,
  reportItems = [],
  activeTab,
  defaultTab = "questions",
  onChangeTab,
  filterMode,
  defaultFilterMode = "yes",
  onToggleFilter,
  onExportPdf,
  formatCurrency,
  className,
}) => {
  const [internalTab, setInternalTab] = useState<AuditEditTab>(defaultTab);
  const [internalFilter, setInternalFilter] =
    useState<QuestionsFilterMode>(defaultFilterMode);

  const tab = activeTab ?? internalTab;
  const qFilter = filterMode ?? internalFilter;

  const handleChangeTab = (t: AuditEditTab) =>
    onChangeTab ? onChangeTab(t) : setInternalTab(t);

  const handleToggleFilter = () =>
    onToggleFilter
      ? onToggleFilter()
      : setInternalFilter((prev) => (prev === "yes" ? "all" : "yes"));

  const toCurrency = useMemo(() => {
    if (formatCurrency) return formatCurrency;
    try {
      const f = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      });
      return (n: number) => f.format(n);
    } catch {
      return (n: number) => `$${n.toLocaleString()}`;
    }
  }, [formatCurrency]);

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

          <ReportItemsTable items={reportItems} formatCurrency={toCurrency} />
        </section>
      )}
    </div>
  );
};

export default AuditEditContent;
