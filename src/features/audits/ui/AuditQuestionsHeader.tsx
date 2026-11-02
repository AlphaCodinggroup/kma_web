"use client";

import React from "react";
import { Filter } from "lucide-react";
import { cn } from "@shared/lib/cn";

export type QuestionsFilterMode = "all" | "no" | "yes" | "unsure";

export interface AuditQuestionsHeaderProps {
  filterMode: QuestionsFilterMode;
  onFilterChange?: (mode: QuestionsFilterMode) => void;
  className?: string;
  containerPaddingClassName?: string;
  ariaLabelledById?: string;
}

const FILTER_OPTIONS: { value: QuestionsFilterMode; label: string }[] = [
  { value: "all", label: "All Answers" },
  { value: "no", label: '"NO" Answers' },
  { value: "yes", label: '"YES" Answers' },
  { value: "unsure", label: '"UNSURE - FURTHER REVIEW"' },
];

const AuditQuestionsHeader: React.FC<AuditQuestionsHeaderProps> = ({
  filterMode,
  onFilterChange,
  className,
  containerPaddingClassName = "px-4 sm:px-6 lg:px-8",
  ariaLabelledById,
}) => {
  const activeFilter = FILTER_OPTIONS.find((opt) => opt.value === filterMode);

  return (
    <div
      className={cn("w-full", containerPaddingClassName, className)}
      aria-labelledby={ariaLabelledById}
      data-testid="audit-questions-header"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {activeFilter?.label ?? "All Questions"}
        </h2>

        <div className="flex min-w-0 w-full items-center gap-2 sm:w-auto">
          <Filter className="h-4 w-4 text-[var(--kma-muted)]" aria-hidden="true" />
          <select
            value={filterMode}
            onChange={(e) => onFilterChange?.(e.target.value as QuestionsFilterMode)}
            className="min-h-[var(--kma-control-height)] min-w-0 w-full flex-1 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 py-2 text-sm hover:bg-[var(--kma-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--kma-primary)] sm:w-auto"
            aria-label="Filter questions"
            data-testid="audit-questions-filter"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Show {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AuditQuestionsHeader;
