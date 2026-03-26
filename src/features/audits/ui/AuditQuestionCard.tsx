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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useUpdateAuditAnswerMutation } from "../lib/hooks/useUpdateAuditAnswerMutation";
import type { AnswerItemUpdate } from "@entities/audit/model/audit-review-answer-update";

export type QuestionType = "yes_no" | "multiple_choice" | "number" | "text";

export interface AttachmentVM {
  id: string;
  name: string;
  mime?: string | null;
}

export interface AuditQuestionCardProps {
  auditId?: string | undefined;
  questionId?: string | undefined;
  steps?: any[] | undefined;
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

function SelectionPill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-3 py-1 text-sm font-semibold",
        "bg-black text-white"
      )}
    >
      {label}
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
  auditId,
  questionId,
  steps,
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
  const [isEditing, setIsEditing] = useState(false);
  const [draftAnswer, setDraftAnswer] = useState<"YES" | "NO" | null>(null);
  const [draftForm, setDraftForm] = useState<Record<string, any>>({});
  const { mutateAsync: updateAnswer, isPending } = useUpdateAuditAnswerMutation();

  const handleSave = async () => {
    if (!draftAnswer || !auditId || !questionId) return;

    const updates: AnswerItemUpdate[] = [
      { step_id: questionId, answer: draftAnswer },
    ];

    if (draftAnswer === "NO") {
      const currentStep = steps?.find((s: any) => s.id === questionId);
      const noNextId = currentStep?.no_next;
      if (noNextId) {
        updates.push({
          step_id: noNextId,
          type: "form",
          values: draftForm,
        });
      }
    }

    try {
      await updateAnswer({ auditId, answers: updates });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update answer");
    }
  };

  // added props dynamically above but need them extracted:
  // using rest args if I didn't add them, wait, I can't extract them unless I modify the signature.
  // actually, let's modify the signature using another chunk !
  const stylesContainerCard =
    "rounded-2xl border border-gray-100 bg-card p-6 shadow-sm sm:p-7";
  const hasChoice =
    type === "multiple_choice" &&
    answerValue !== undefined &&
    answerValue !== null &&
    String(answerValue).trim().length > 0;

  /* ===== UNSURE (EDITABLE) ===== */
  const isUnsure =
    typeof answerValue === "string" && answerValue.toUpperCase() === "UNSURE";

  if (isUnsure) {
    if (isEditing) {
      return (
        <article
          className={cn(
            "rounded-2xl border border-blue-200 bg-blue-50/30 p-6 sm:p-7",
            className
          )}
        >
          <HeroSection
            text={text}
            pill={<SelectionPill label="UNSURE (Editing)" />}
          />
          <NotesSection {...(notes === undefined ? {} : { notes })} />

          <div className="mt-6 border-t pt-4">
            <h5 className="mb-3 text-sm font-semibold">Change Answer</h5>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftAnswer("YES");
                  setDraftForm({});
                }}
                className={cn(
                  "inline-flex rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
                  draftAnswer === "YES"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                )}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setDraftAnswer("NO")}
                className={cn(
                  "inline-flex rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
                  draftAnswer === "NO"
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                )}
              >
                NO
              </button>
            </div>

            {draftAnswer === "NO" && (
              <div className="mb-4 space-y-4 rounded-xl border bg-card p-4">
                <h6 className="text-sm font-medium">Finding details</h6>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Quantity
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={draftForm.quantity || ""}
                      onChange={(e) =>
                        setDraftForm((prev) => ({
                          ...prev,
                          quantity: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Notes / Measurements
                    </label>
                    <textarea
                      className="h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={draftForm.notes || ""}
                      onChange={(e) =>
                        setDraftForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="text-xs italic text-muted-foreground">
                    Use the "Edit Finding" dialog later to upload images.
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!draftAnswer || isPending}
                className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-transparent px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </article>
      );
    }

    return (
      <article
        className={cn(
          stylesContainerCard,
          "border-orange-200 bg-orange-50/30",
          className
        )}
      >
        <HeroSection text={text} pill={<SelectionPill label="UNSURE" />} />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
        <div className="mt-4 flex justify-start border-t pt-4">
          <button
            type="button"
            className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            onClick={() => setIsEditing(true)}
          >
            Resolve Answer...
          </button>
        </div>
      </article>
    );
  }

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

  /* ===== MULTIPLE CHOICE (estética YES, muestra opción) ===== */
  if (hasChoice) {
    return (
      <article className={cn(stylesContainerCard, className)}>
        <HeroSection
          text={text}
          pill={<SelectionPill label={String(answerValue)} />}
        />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
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
