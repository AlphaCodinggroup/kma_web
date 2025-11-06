"use client";

import React from "react";
import { Filter } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/controls";

export type QuestionsFilterMode = "no" | "all";

export interface AuditQuestionsHeaderProps {
  filterMode: QuestionsFilterMode;
  onToggleFilter?: () => void;
  className?: string;
  containerPaddingClassName?: string;
  ariaLabelledById?: string;
}

const AuditQuestionsHeader: React.FC<AuditQuestionsHeaderProps> = ({
  filterMode,
  onToggleFilter,
  className,
  containerPaddingClassName = "px-4 sm:px-6 lg:px-8",
  ariaLabelledById,
}) => {
  const isNoOnly = filterMode === "no";

  const title = isNoOnly ? "Questions Answered NO" : "All Questions";
  const toggleLabel = isNoOnly ? "Show All Questions" : "Show NO Only";
  return (
    <div
      className={cn("w-full", containerPaddingClassName, className)}
      aria-labelledby={ariaLabelledById}
      data-testid="audit-questions-header"
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <h3 className="text-2xl font-bold">{title}</h3>

        <Button
          type="button"
          onClick={onToggleFilter}
          disabled={!onToggleFilter}
          aria-pressed={isNoOnly}
          aria-label={toggleLabel}
          className="justify-self-end font-semibold"
          data-testid="audit-questions-toggle"
        >
          <Filter className="mr-2 h-[18px] w-[18px]" aria-hidden="true" />
          <span>{toggleLabel}</span>
        </Button>
      </div>
    </div>
  );
};

export default AuditQuestionsHeader;
