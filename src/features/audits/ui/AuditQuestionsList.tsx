"use client";

import React, { useMemo } from "react";
import { cn } from "@shared/lib/cn";
import AuditQuestionCard, {
  type QuestionType,
  type AttachmentVM,
} from "./AuditQuestionCard";
import type { QuestionsFilterMode } from "./AuditQuestionsHeader";

export interface QuestionItemVM {
  id: string;
  index?: number;
  text: string;
  type: QuestionType;
  answeredYes?: boolean | null;
  answerValue?: string | number | null;
  notes?: string | null;
  attachments?: AttachmentVM[];
}

export interface AuditQuestionsListProps {
  items: QuestionItemVM[];
  filterMode?: QuestionsFilterMode;
  className?: string;
  containerPaddingClassName?: string;
  ariaLabelledById?: string;
}

export const AuditQuestionsList: React.FC<AuditQuestionsListProps> = ({
  items,
  filterMode = "all",
  className,
  containerPaddingClassName = "px-4 sm:px-6 lg:px-8",
  ariaLabelledById,
}) => {
  const filtered = useMemo(
    () =>
      filterMode === "no"
        ? items.filter((q) => q.answeredYes === false)
        : items,
    [items, filterMode]
  );

  const hasItems = filtered.length > 0;

  return (
    <section
      className={cn("w-full", containerPaddingClassName, className)}
      aria-labelledby={ariaLabelledById}
      data-testid="audit-questions-list"
    >
      {hasItems ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {filtered.map((q, i) => (
            <AuditQuestionCard
              key={q.id}
              index={q.index ?? i + 1}
              text={q.text}
              type={q.type}
              {...(q.answeredYes === undefined
                ? {}
                : { answeredYes: q.answeredYes ?? null })}
              {...(q.answerValue === undefined
                ? {}
                : { answerValue: q.answerValue ?? null })}
              {...(q.notes === undefined ? {} : { notes: q.notes ?? null })}
              {...(q.attachments === undefined
                ? {}
                : { attachments: q.attachments })}
            />
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border bg-card/40 p-8 text-center"
          role="status"
          aria-live="polite"
          data-testid="audit-questions-empty"
        >
          <p className="text-sm text-muted-foreground">
            {filterMode === "no"
              ? "No questions with NO answer found."
              : "No questions available."}
          </p>
        </div>
      )}
    </section>
  );
};

export default AuditQuestionsList;
