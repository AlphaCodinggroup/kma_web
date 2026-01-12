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
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <h3 className="text-2xl font-bold">
          {activeFilter?.label ?? "All Questions"}
        </h3>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <select
            value={filterMode}
            onChange={(e) => onFilterChange?.(e.target.value as QuestionsFilterMode)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
