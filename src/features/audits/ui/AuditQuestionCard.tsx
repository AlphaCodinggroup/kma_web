"use client";

import React, { memo, type ReactNode } from "react";
import {
  Paperclip,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  MessageSquare,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/controls";

export type QuestionType = "yes_no" | "multiple_choice" | "number" | "text";

export interface AttachmentVM {
  id: string;
  name: string;
  mime?: string | null;
}

export interface AuditQuestionCardProps {
  index?: number;
  text: string;
  type: QuestionType;
  answeredYes?: boolean | null;
  answerValue?: string | number | null;
  notes?: string | null;
  attachments?: AttachmentVM[];
  onViewAttachment?: (att: AttachmentVM) => void;
  className?: string;
}

/* ===== Helpers ===== */

const iconForMime = (mime?: string | null) => {
  if (!mime) return <FileIcon className="h-4 w-4" aria-hidden="true" />;
  if (mime.includes("pdf"))
    return <FileText className="h-4 w-4" aria-hidden="true" />;
  if (mime.startsWith("image/"))
    return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
  return <FileIcon className="h-4 w-4" aria-hidden="true" />;
};

function HeroSection({ text, pill }: { text: string; pill: ReactNode }) {
  return (
    <>
      <div
        role="heading"
        aria-level={4}
        className="text-xl font-extrabold leading-snug"
      >
        {text}
      </div>
      <div className="mt-4">{pill}</div>
    </>
  );
}

function YesNoPill({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-3 py-1 text-sm font-semibold",
        value ? "bg-black text-white" : "bg-red-500 text-white"
      )}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function NotesSection({ notes }: { notes?: string | null }) {
  const hasNotes = typeof notes === "string" && notes.trim().length > 0;
  if (!hasNotes) return null;

  return (
    <div className="mt-6">
      <div className="text-sm font-semibold">Auditor Notes</div>
      <p className="mt-2 text-base text-muted-foreground">{notes}</p>
    </div>
  );
}

function AttachmentsList({
  attachments,
  onViewAttachment,
  dense = false,
}: {
  attachments: AttachmentVM[];
  onViewAttachment?: (att: AttachmentVM) => void;
  dense?: boolean;
}) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={cn("mt-6", dense && "mt-4")}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        Attachments
      </div>
      <ul className={cn(dense ? "space-y-2" : "space-y-3")}>
        {attachments.map((att) => (
          <li
            key={att.id}
            className={cn(
              "grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-gray-300",
              dense ? "p-2.5" : "p-3"
            )}
            data-testid={`attachment-${att.id}`}
          >
            <div className="min-w-0 flex items-center gap-2">
              {iconForMime(att.mime)}
              <span className="truncate text-sm">{att.name}</span>
            </div>
            <Button
              type="button"
              onClick={
                onViewAttachment ? () => onViewAttachment(att) : undefined
              }
              // disabled={!onViewAttachment}
              aria-label={`View ${att.name}`}
              className={cn(
                "h-8 rounded-lg border px-3 text-xs",
                "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
              )}
            >
              View
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===== Component ===== */

function typeLabel(t: QuestionType) {
  switch (t) {
    case "yes_no":
      return "Yes / No";
    case "multiple_choice":
      return "Multiple Choice";
    case "number":
      return "Number";
    case "text":
      return "Text";
    default:
      return t;
  }
}

function YesNoChip({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        value
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
      )}
    >
      {value ? "YES" : "NO"}
    </span>
  );
}

const AuditQuestionCard: React.FC<AuditQuestionCardProps> = ({
  index,
  text,
  type,
  answeredYes,
  answerValue,
  notes,
  attachments = [],
  onViewAttachment,
  className,
}) => {
  const stylesContainerCard =
    "rounded-2xl border border-gray-100 bg-card p-6 shadow-sm sm:p-7";
  /* ===== YES ===== */
  if (answeredYes === true) {
    return (
      <article className={cn(stylesContainerCard, className)}>
        <HeroSection text={text} pill={<YesNoPill value={true} />} />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
      </article>
    );
  }

  /* ===== NO ===== */
  if (answeredYes === false) {
    return (
      <article className={cn(stylesContainerCard, className)}>
        <HeroSection text={text} pill={<YesNoPill value={false} />} />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
        <AttachmentsList
          attachments={attachments}
          {...(onViewAttachment ? { onViewAttachment } : {})}
        />
      </article>
    );
  }

  /* ===== GENERAL ===== */
  const hasNotes = typeof notes === "string" && notes.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const hasAnswer =
    answerValue !== undefined &&
    answerValue !== null &&
    (typeof answerValue === "number" || String(answerValue).length > 0);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card/50 p-4 sm:p-5 transition-colors",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {typeof index === "number" ? (
              <span className="text-xs text-muted-foreground">#{index}</span>
            ) : null}
            <div
              role="heading"
              aria-level={5}
              className="truncate text-sm font-medium"
            >
              {text}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border px-1.5 py-0.5">
              {typeLabel(type)}
            </span>
            {typeof answeredYes === "boolean" ? (
              <>
                <span className="select-none">•</span>
                <YesNoChip value={answeredYes} />
              </>
            ) : null}
          </div>

          {hasAnswer ? (
            <div className="mt-2 text-xs text-foreground/90">
              <span className="text-muted-foreground">Answer:</span>{" "}
              <span className="font-medium">{String(answerValue)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {hasNotes ? (
        <div className="mt-4 rounded-xl border bg-background/60 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Notes
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{notes}</p>
        </div>
      ) : null}

      {hasAttachments ? (
        <AttachmentsList
          attachments={attachments}
          {...(onViewAttachment ? { onViewAttachment } : {})}
        />
      ) : null}
    </article>
  );
};
export default memo(AuditQuestionCard);
