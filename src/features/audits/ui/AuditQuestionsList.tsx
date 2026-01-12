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
  order?: number;
  text: string;
  type: QuestionType;
  answer?: string | number | boolean | null;
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
  const normalizeItem = (q: QuestionItemVM): QuestionItemVM => {
    let answeredYes = q.answeredYes;
    let answerValue = q.answerValue;

    const raw = (q as any).answer as string | number | boolean | null | undefined;

    if (answeredYes === undefined) {
      if (typeof raw === "boolean") {
        answeredYes = raw;
      } else if (typeof raw === "string") {
        const upper = raw.toUpperCase();
        if (upper === "YES" || upper === "SI" || upper === "TRUE") {
          answeredYes = true;
        } else if (upper === "NO" || upper === "FALSE") {
          answeredYes = false;
        }
      }
    }

    if (answerValue === undefined && raw !== undefined) {
      if (typeof raw === "boolean") {
        answerValue = raw ? "YES" : "NO";
      } else {
        answerValue = raw as string | number | null;
      }
    }

    return {
      ...q,
      ...(answeredYes === undefined ? {} : { answeredYes }),
      ...(answerValue === undefined ? {} : { answerValue }),
      ...(q.index ?? q.order
        ? { index: (q.index ?? q.order) as number }
        : {}),
      // No mostramos adjuntos/fotos en esta vista
      attachments: [],
    };
  };

  const normalizedItems = useMemo(() => items.map(normalizeItem), [items]);

  const hasAnswerValue = (q: QuestionItemVM) =>
    q.answerValue !== undefined &&
    q.answerValue !== null &&
    String(q.answerValue).trim().length > 0;

  const itemsWithAnswer = useMemo(() => {
    return normalizedItems.filter((q) => {
      const hasNotes =
        typeof q.notes === "string" && q.notes.trim().length > 0;
      const hasValue = hasAnswerValue(q);
      const hasYesNo = typeof q.answeredYes === "boolean";

      return hasYesNo || hasValue || hasNotes;
    });
  }, [normalizedItems]);

  const filtered = useMemo(() => {
    if (filterMode === "all") {
      return itemsWithAnswer;
    }

    if (filterMode === "no") {
      return itemsWithAnswer.filter((q) => {
        if (q.answeredYes === false) return true;
        const hasNotes =
          typeof q.notes === "string" && q.notes.trim().length > 0;
        return q.answeredYes === undefined && (hasAnswerValue(q) || hasNotes);
      });
    }

    if (filterMode === "yes") {
      return itemsWithAnswer.filter((q) => q.answeredYes === true);
    }

    if (filterMode === "unsure") {
      return itemsWithAnswer.filter((q) => {
        // Unsure means: not clearly yes/no, or has notes indicating review needed
        const isUnclear = q.answeredYes === undefined || q.answeredYes === null;
        const hasReviewNotes =
          typeof q.notes === "string" &&
          (q.notes.toLowerCase().includes("review") ||
            q.notes.toLowerCase().includes("unsure") ||
            q.notes.toLowerCase().includes("unclear"));
        return isUnclear || hasReviewNotes;
      });
    }

    return itemsWithAnswer;
  }, [itemsWithAnswer, filterMode]);

  const hasItems = filtered.length > 0;

  const getEmptyMessage = () => {
    if (filterMode === "no") return "No questions with NO answer found.";
    if (filterMode === "yes") return "No questions with YES answer found.";
    if (filterMode === "unsure") return "No questions requiring further review found.";
    return "No questions available.";
  };

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
            {getEmptyMessage()}
          </p>
        </div>
      )}
    </section>
  );
};

export default AuditQuestionsList;
