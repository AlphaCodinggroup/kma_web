"use client";

import React, { memo, useCallback } from "react";
import { cn } from "@shared/lib/cn";
import { Tabs, TabsList, TabsTrigger } from "@shared/ui/tabs";

export type AuditEditTab = "questions" | "report";

export interface AuditEditTabsBarProps {
  activeTab: AuditEditTab;
  onChangeTab: (tab: AuditEditTab) => void;
  className?: string | undefined;
  containerPaddingClassName?: string;
  ariaLabel?: string;
  ariaLabelledById?: string;
  disabledTabs?: Partial<Record<AuditEditTab, boolean>>;
}

const AuditEditTabsBar: React.FC<AuditEditTabsBarProps> = ({
  activeTab,
  onChangeTab,
  className,
  containerPaddingClassName = "px-4 sm:px-6 lg:px-8",
  ariaLabel,
  ariaLabelledById,
  disabledTabs,
}) => {
  const handleChange = useCallback(
    (v: string) => {
      if (v === "questions" || v === "report") onChangeTab(v);
    },
    [onChangeTab]
  );
  return (
    <div
      className={cn("sticky top-0 z-20 w-full border-b border-[var(--kma-border)] bg-[var(--kma-surface)] py-3", containerPaddingClassName, className)}
      data-testid="audit-edit-tabs"
    >
      <div className="flex items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={handleChange}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : ariaLabelledById}
        >
          <TabsList className="rounded bg-transparent">
            <TabsTrigger
              value="questions"
              id="audit-questions-tab"
              aria-controls="audit-questions-panel"
              disabled={disabledTabs?.questions}
              className={cn(
                "min-h-[var(--kma-control-height)] rounded px-4 data-[state=active]:bg-[var(--kma-selected)] data-[state=active]:text-[var(--kma-fg)]"
              )}
              data-testid="tab-questions"
            >
              Questions &amp; Answers
            </TabsTrigger>

            <TabsTrigger
              value="report"
              id="audit-report-tab"
              aria-controls="audit-report-panel"
              disabled={disabledTabs?.report}
              className={cn(
                "min-h-[var(--kma-control-height)] rounded px-4 data-[state=active]:bg-[var(--kma-selected)] data-[state=active]:text-[var(--kma-fg)]"
              )}
              data-testid="tab-report"
            >
              Report
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

export default memo(AuditEditTabsBar);
