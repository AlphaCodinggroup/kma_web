"use client";

import * as React from "react";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Modal } from "@shared/ui/modal";
import { Badge } from "@shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";

/** =========================
 *  Tipos de Vista (UI only)
 *  ========================= */
export type QuestionType = "yes_no" | "multiple_choice" | "text_input";

export interface FlowQuestionVM {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // para multiple_choice
  visibleIf?: { questionId: string; equals: string | number | boolean };
}

export interface FlowDetailVM {
  title: string;
  description?: string;
  questions: FlowQuestionVM[];
}

export interface FlowQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: FlowDetailVM; // UI-dummy; luego reemplazamos por dominio real
  className?: string;
  "data-testid"?: string;
}

/** =========================
 *  Helpers de presentación
 *  ========================= */
function typeBadgeLabel(t: QuestionType) {
  switch (t) {
    case "yes_no":
      return "Yes/No";
    case "multiple_choice":
      return "Multiple Choice";
    case "text_input":
      return "Text Input";
    default:
      return t;
  }
}

const QuestionCard: React.FC<{ index: number; q: FlowQuestionVM }> = ({
  index,
  q,
}) => {
  return (
    <Card
      className={cn(
        "mb-4 rounded-xl border border-gray-200 bg-white shadow-sm"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-sm font-semibold text-gray-700">
            {`Q${index + 1}`}
          </div>
          <CardTitle className="text-base font-medium leading-snug text-black">
            {q.text}
          </CardTitle>
        </div>

        <Badge
          variant="soft"
          tone="neutral"
          size="sm"
          className="shrink-0 select-none"
          aria-label={`question-type-${q.type}`}
        >
          {typeBadgeLabel(q.type)}
        </Badge>
      </CardHeader>

      {q.type === "multiple_choice" && q.options && q.options.length > 0 ? (
        <CardContent className="pt-0">
          <p className="mb-1 text-sm text-gray-600">Options:</p>
          <ul className="ml-1 list-disc space-y-1 pl-5 text-sm text-gray-800">
            {q.options.map((opt, i) => (
              <li key={i} className="leading-relaxed">
                {opt}
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}

      {q.visibleIf ? (
        <CardContent className="pt-0">
          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-800">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">
              <span className="font-medium">Conditional:</span>{" "}
              <span>
                Shows when {q.visibleIf.questionId.toUpperCase()} = "
                {String(q.visibleIf.equals)}"
              </span>
            </p>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
};

/** =========================
 *  Componente principal
 *  ========================= */
export const FlowQuestionsDialog: React.FC<FlowQuestionsDialogProps> = ({
  open,
  onOpenChange,
  flow,
  className,
  "data-testid": testId,
}) => {
  const count = flow.questions.length;
  const headingId = React.useId();

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          "relative mx-auto w-full max-w-3xl",
          "rounded-2xl border border-gray-200 bg-white shadow-xl",
          "outline-none",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid={testId ?? "flow-questions-dialog"}
      >
        {/* Botón de cierre (X) en la esquina superior derecha */}

        {/* Header */}
        <div className="sticky top-0 z-10 rounded-t-2xl bg-white px-6 pb-4 pt-6">
          <button
            type="button"
            aria-label="Close questions modal"
            data-testid="close-questions-dialog"
            onClick={() => onOpenChange(false)}
            className={cn(
              "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center cursor-pointer"
            )}
          >
            <X className="h-4 w-4" />
          </button>
          <h2
            id={headingId}
            className="text-2xl font-semibold leading-tight text-black"
          >
            {flow.title}
          </h2>
          {flow.description ? (
            <p className="mt-1 text-sm text-gray-600">{flow.description}</p>
          ) : null}
        </div>

        {/* Body scrollable */}
        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          <h3 className="mb-4 text-base font-semibold text-black">
            Questions ({count})
          </h3>

          {flow.questions.map((q, idx) => (
            <QuestionCard key={q.id} index={idx} q={q} />
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default FlowQuestionsDialog;
