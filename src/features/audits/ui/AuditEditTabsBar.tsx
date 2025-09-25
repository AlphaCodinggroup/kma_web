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
      className={cn("w-full", containerPaddingClassName, className)}
      data-testid="audit-edit-tabs"
    >
      <div className="flex items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={handleChange}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : ariaLabelledById}
        >
          <TabsList>
            <TabsTrigger
              value="questions"
              disabled={disabledTabs?.questions}
              className={cn(
                "data-[state=active]:bg-white data-[state=active]:text-foreground"
              )}
              data-testid="tab-questions"
            >
              Questions &amp; Attachments
            </TabsTrigger>

            <TabsTrigger
              value="report"
              disabled={disabledTabs?.report}
              className={cn(
                "data-[state=active]:bg-white data-[state=active]:text-foreground"
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
