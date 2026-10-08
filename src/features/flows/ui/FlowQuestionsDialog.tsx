"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalCloseButton } from "@shared/ui/modal";
import { Badge } from "@shared/ui/badge";
import { Button } from "@shared/ui/controls";
import { Loading } from "@shared/ui/Loading";

export type QuestionType = "yes_no" | "multiple_choice" | "text_input";

export interface FlowQuestionVM {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
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
  flow: FlowDetailVM;
  className?: string;
  isLoading?: boolean | undefined;
  error?: string | undefined;
  onRetry?: (() => void) | undefined;
  "data-testid"?: string;
}

function typeBadgeLabel(type: QuestionType) {
  switch (type) {
    case "yes_no": return "Yes/No";
    case "multiple_choice": return "Multiple Choice";
    case "text_input": return "Text Input";
    default: return type;
  }
}

const QuestionCard: React.FC<{ index: number; q: FlowQuestionVM }> = ({ index, q }) => (
  <article className="py-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center border border-[var(--kma-border)] px-1 text-xs font-medium tabular-nums text-[var(--kma-muted)]">Q{index + 1}</span>
        <h4 className="break-words text-base font-medium leading-6 text-[var(--kma-fg)]">{q.text}</h4>
      </div>
      <Badge variant="soft" tone="neutral" size="sm" className="shrink-0" aria-label={`question-type-${q.type}`}>{typeBadgeLabel(q.type)}</Badge>
    </div>
    {q.type === "multiple_choice" && q.options && q.options.length > 0 ? (
      <div className="mt-3 pl-8">
        <p className="text-sm text-[var(--kma-muted)]">Options:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--kma-fg)]">{q.options.map((option, index) => <li key={index}>{option}</li>)}</ul>
      </div>
    ) : null}
    {q.visibleIf ? (
      <div className="mt-3 flex items-start gap-2 pl-8 text-[var(--kma-muted)]">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs"><span className="font-medium">Conditional:</span> Shows when {q.visibleIf.questionId.toUpperCase()} = "{String(q.visibleIf.equals)}"</p>
      </div>
    ) : null}
  </article>
);

export const FlowQuestionsDialog: React.FC<FlowQuestionsDialogProps> = ({ open, onOpenChange, flow, className, isLoading = false, error, onRetry, "data-testid": testId }) => (
  <Modal open={open} onOpenChange={onOpenChange}>
    <ModalContent className={cn("flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col overflow-hidden", className)}>
      <div data-testid={testId ?? "flow-questions-dialog"} className="flex min-h-0 flex-col">
        <ModalCloseButton aria-label="Close questions modal" data-testid="close-questions-dialog" onClick={() => onOpenChange(false)} />
        <ModalHeader className="shrink-0 pr-8">
          <ModalTitle className="break-words">{flow.title}</ModalTitle>
          {flow.description ? <ModalDescription>{flow.description}</ModalDescription> : null}
        </ModalHeader>
        <div className="min-h-0 overflow-y-auto">
          <h3 className="border-y border-[var(--kma-border)] py-3 text-sm font-semibold text-[var(--kma-fg)]">Questions ({flow.questions.length})</h3>
          {isLoading ? <Loading text="Loading questions…" /> : error ? <div role="alert" className="py-8"><p className="text-sm text-[var(--kma-danger)]">{error}</p>{onRetry ? <Button type="button" variant="secondary" fullWidth={false} className="mt-4" onClick={onRetry}>Try again</Button> : null}</div> : flow.questions.length === 0 ? <p className="py-8 text-sm text-[var(--kma-muted)]">This flow has no questions to display.</p> : <div className="divide-y divide-[var(--kma-border)]">{flow.questions.map((question, index) => <QuestionCard key={question.id} index={index} q={question} />)}</div>}
        </div>
      </div>
    </ModalContent>
  </Modal>
);

export default FlowQuestionsDialog;
