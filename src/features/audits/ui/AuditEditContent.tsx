"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@shared/lib/cn";
import AuditEditTabsBar, { type AuditEditTab } from "./AuditEditTabsBar";
import AuditQuestionsList, { type QuestionItemVM } from "./AuditQuestionsList";
import { Button } from "@shared/ui/controls";
import { Image as ImageIcon } from "lucide-react";
import AuditQuestionsHeader, {
  type QuestionsFilterMode,
} from "./AuditQuestionsHeader";

export type ReportSeverity = "high" | "medium" | "low";
export interface ReportItemVM {
  id: string;
  title: string;
  severity: ReportSeverity;
  photos?: string[];
  quantity?: number | null;
  unitPrice?: number | null;
}

function SeverityBadge({ level }: { level: ReportSeverity }) {
  const map: Record<ReportSeverity, string> = {
    high: "bg-destructive/15 text-destructive-foreground",
    medium: "bg-warning/20 text-warning-foreground",
    low: "bg-success/20 text-success-foreground",
  };
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[level])}
    >
      {level.toUpperCase()}
    </span>
  );
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
  onExportItem?: (item: ReportItemVM) => void;
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
  defaultFilterMode = "all",
  onToggleFilter,
  onExportItem,
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
        <section
          className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8"
          aria-live="polite"
        >
          {reportItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              {reportItems.map((item) => {
                const qty = item.quantity ?? null;
                const price = item.unitPrice ?? null;
                const total =
                  typeof qty === "number" && typeof price === "number"
                    ? qty * price
                    : null;

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border bg-card/50 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-medium">
                          {item.title}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <SeverityBadge level={item.severity} />
                          {typeof qty === "number" && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span>
                                Qty: <span className="font-medium">{qty}</span>
                              </span>
                            </>
                          )}
                          {typeof price === "number" && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span>
                                Unit:{" "}
                                <span className="font-medium">
                                  {toCurrency(price)}
                                </span>
                              </span>
                            </>
                          )}
                          {total !== null && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span>
                                Total:{" "}
                                <span className="font-semibold">
                                  {toCurrency(total)}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={
                          onExportItem ? () => onExportItem(item) : undefined
                        }
                        disabled={!onExportItem}
                        aria-label={`Export ${item.title}`}
                        className={cn(
                          "h-9 rounded-xl border bg-background px-3 text-sm",
                          "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
                        )}
                        data-testid={`export-${item.id}`}
                      >
                        Export Item
                      </Button>
                    </div>

                    {item.photos && item.photos.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {item.photos.map((_, idx) => (
                          <div
                            key={`${item.id}-ph-${idx}`}
                            className="relative aspect-video overflow-hidden rounded-xl border bg-muted/30"
                            role="img"
                            aria-label="Report photo placeholder"
                          >
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon
                                className="h-6 w-6 opacity-60"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-card/40 p-8 text-center"
              data-testid="report-empty"
            >
              <p className="text-sm text-muted-foreground">
                No report items available.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AuditEditContent;
