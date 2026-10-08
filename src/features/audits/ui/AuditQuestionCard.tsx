"use client";

import React, { memo, type ReactNode } from "react";
import Image from "next/image";
import {
  Paperclip,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  MessageSquare,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/controls";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useUpdateAuditAnswerMutation } from "../lib/hooks/useUpdateAuditAnswerMutation";
import type { AnswerItemUpdate } from "@entities/audit/model/audit-review-answer-update";
import { flowsRepo } from "@features/flows/api/flows.repo.impl";
import { httpClient } from "@shared/api/http.client";

export type QuestionType = "yes_no" | "multiple_choice" | "number" | "text";

export interface AttachmentVM {
  id: string;
  name: string;
  mime?: string | null;
  url?: string;
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div
        role="heading"
        aria-level={3}
        className="font-heading min-w-0 max-w-[65ch] break-words text-base font-semibold leading-relaxed"
      >
        {text}
      </div>
      <div className="shrink-0">{pill}</div>
    </div>
  );
}

function YesNoPill({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold",
        // Como en producción: «Yes» en tinta y «No» en rojo, para que un hallazgo se vea de un vistazo.
        value ? "bg-[var(--kma-fg)] text-[var(--kma-surface)]" : "bg-[var(--kma-danger)] text-[var(--kma-surface)]"
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
        "inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold",
        label.startsWith("UNSURE") ? "bg-[var(--kma-warning-bg)] text-[var(--kma-warning)] ring-1 ring-inset ring-[var(--kma-warning-border)]" : "bg-[var(--kma-fg)] text-[var(--kma-surface)]"
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
    <div className="mt-5 border-t border-[var(--kma-border)] pt-4">
      <div className="text-sm font-semibold">Auditor Notes</div>
      <p className="mt-2 max-w-[65ch] whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--kma-muted)]">{notes}</p>
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
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={cn("min-w-0", dense && "mt-4")}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        Attachments
      </div>
      <ul className={cn("grid gap-4", dense && "gap-2")}>
        {attachments.map((att) => {
          const candidate = att.url?.trim() ?? "";
          const safeUrl = /^https?:\/\//i.test(candidate) || (candidate.startsWith("/") && !candidate.startsWith("//")) ? candidate : null;
          const photograph = Boolean(safeUrl && (att.mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.test(att.name)));
          return (
          <li
            key={att.id}
            className={cn(
              "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2",
              dense && "py-2"
            )}
            data-testid={`attachment-${att.id}`}
          >
            {photograph && !failedImages.has(att.id) && <a href={safeUrl!} target="_blank" rel="noopener noreferrer" aria-label={`Open photograph ${att.name}`} className="col-span-2 block overflow-hidden rounded border border-[var(--kma-border)] bg-[var(--kma-subtle)]">
              <Image unoptimized src={safeUrl!} alt={att.name} width={480} height={320} className="aspect-[3/2] max-h-72 w-full object-contain" onError={() => setFailedImages(current => new Set([...current, att.id]))} />
            </a>}
            {photograph && failedImages.has(att.id) && <p className="col-span-2 border border-[var(--kma-border)] bg-[var(--kma-subtle)] p-4 text-sm text-[var(--kma-muted)]" role="status">Photograph unavailable. Open the original file to try again.</p>}
            <div className="min-w-0 flex flex-1 items-center gap-2">
              {iconForMime(att.mime)}
              <span className="break-words text-sm">{att.name}</span>
            </div>
            {!safeUrl && !onViewAttachment && <p className="col-span-2 text-sm text-[var(--kma-muted)]">The original file is unavailable.</p>}
            {safeUrl && !onViewAttachment ? <a href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${att.name}`} className="inline-flex min-h-11 items-center rounded border border-[var(--kma-border)] px-3 text-sm font-semibold hover:bg-[var(--kma-input)]">View</a> : <Button
              type="button"
              variant="secondary"
              fullWidth={false}
              disabled={!onViewAttachment}
              onClick={
                onViewAttachment ? () => onViewAttachment(att) : undefined
              }
              aria-label={`View ${att.name}`}
              className={cn(
                "min-h-11 rounded px-3 text-sm"
              )}
            >
              View
            </Button>}
          </li>
        );})}
      </ul>
    </div>
  );
}

function EvidenceComposition({ children, attachments, onViewAttachment, className }: {
  children: ReactNode;
  attachments: AttachmentVM[];
  onViewAttachment?: (att: AttachmentVM) => void;
  className?: string | undefined;
}) {
  return (
    <article className={cn("bg-[var(--kma-surface)] p-4 sm:p-6", className)}>
      <div className={cn("grid min-w-0 gap-6", attachments.length > 0 && "md:grid-cols-[minmax(0,1fr)_minmax(240px,38%)]")}>
        <div className="min-w-0">{children}</div>
        {attachments.length > 0 && <div className="min-w-0 border-t border-[var(--kma-border)] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <AttachmentsList attachments={attachments} {...(onViewAttachment ? { onViewAttachment } : {})} />
        </div>}
      </div>
    </article>
  );
}

/* ===== Dynamic Form Fields ===== */

interface FlowFormField {
  id: string;
  type: "text" | "number" | "photo" | "button";
  label: string;
  placeholder?: string;
  unit?: string;
}

function DynamicFormFields({
  fields,
  values,
  onChange,
}: {
  fields: FlowFormField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const fieldPrefix = React.useId();
  // Fallback: no fields defined in the flow → show generic form
  if (!fields || fields.length === 0) {
    return (
      <div className="grid gap-4">
        <div>
          <label htmlFor={`${fieldPrefix}-quantity`} className="mb-1 block text-xs font-semibold text-[var(--kma-muted)]">
            Quantity
          </label>
          <input
            id={`${fieldPrefix}-quantity`}
            type="number"
            className="w-full rounded border bg-[var(--kma-surface)] px-3 py-2 text-sm"
            value={values.quantity ?? ""}
            onChange={(e) => onChange("quantity", Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor={`${fieldPrefix}-notes`} className="mb-1 block text-xs font-semibold text-[var(--kma-muted)]">
            Notes / Measurements
          </label>
          <textarea
            id={`${fieldPrefix}-notes`}
            className="h-20 w-full rounded border bg-[var(--kma-surface)] px-3 py-2 text-sm"
            value={values.notes ?? ""}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </div>
        <div className="text-xs italic text-[var(--kma-muted)]">
          Use the &quot;Edit Finding&quot; dialog later to upload images.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {fields.map((field) => {
        if (field.type === "number") {
          return (
            <div key={field.id}>
              <label htmlFor={`${fieldPrefix}-${field.id}`} className="mb-1 block text-xs font-semibold text-[var(--kma-muted)]">
                {field.label}
                {field.unit && (
                  <span className="ml-1 font-normal text-[var(--kma-muted)]">
                    ({field.unit})
                  </span>
                )}
              </label>
              <input
                id={`${fieldPrefix}-${field.id}`}
                type="number"
                className="w-full rounded border bg-[var(--kma-surface)] px-3 py-2 text-sm"
                placeholder={field.placeholder ?? ""}
                value={values[field.id] ?? ""}
                onChange={(e) =>
                  onChange(
                    field.id,
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              />
            </div>
          );
        }

        if (field.type === "text") {
          return (
            <div key={field.id}>
              <label htmlFor={`${fieldPrefix}-${field.id}`} className="mb-1 block text-xs font-semibold text-[var(--kma-muted)]">
                {field.label}
              </label>
              <textarea
                id={`${fieldPrefix}-${field.id}`}
                className="h-20 w-full rounded border bg-[var(--kma-surface)] px-3 py-2 text-sm"
                placeholder={field.placeholder ?? ""}
                value={values[field.id] ?? ""}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            </div>
          );
        }

        if (field.type === "photo") {
          const previews: string[] = values[field.id] ?? [];
          return (
            <div key={field.id}>
              <label htmlFor={`${fieldPrefix}-${field.id}`} className="mb-1 block text-xs font-semibold text-[var(--kma-muted)]">
                {field.label}
              </label>
              <input
                id={`${fieldPrefix}-${field.id}`}
                type="file"
                accept="image/*"
                multiple
                className="w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-[var(--kma-accent)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--kma-accent-fg)] hover:file:opacity-90"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const urls = files.map((f) => URL.createObjectURL(f));
                  onChange(field.id, [...previews, ...urls]);
                  // Store File objects under a prefixed key for later upload
                  const existingFiles: File[] =
                    values[`__files__${field.id}`] ?? [];
                  onChange(`__files__${field.id}`, [
                    ...existingFiles,
                    ...files,
                  ]);
                }}
              />
              {previews.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`preview ${i}`}
                      className="h-24 w-32 rounded border border-[var(--kma-border)] object-contain"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }

        // button type: skip rendering in edit form
        return null;
      })}
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
        "bg-[var(--kma-subtle)] text-[var(--kma-fg)]"
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const saving = useRef(false);
  const [draftAnswer, setDraftAnswer] = useState<"YES" | "NO" | null>(null);
  const [draftForm, setDraftForm] = useState<Record<string, any>>({});
  const { mutateAsync: updateAnswer, isPending } =
    useUpdateAuditAnswerMutation();

  // Derive the FormStep fields from the flow steps for this question's NO path
  // Supports recursive Form linking (loading subsequent Form fields)
  const noNextFormFields = React.useMemo((): FlowFormField[] => {
    if (!steps || !questionId) return [];
    const questionStep = steps.find((s: any) => s.id === questionId);
    if (!questionStep) return [];
    
    // Backend may use snake_case or camelCase
    let nextIdToCheck = questionStep.no_next ?? questionStep.noNext;
    const collectedFields: FlowFormField[] = [];
    let sanityCounter = 0;
    
    while (nextIdToCheck && sanityCounter < 20) {
      sanityCounter++;
      const step = steps.find((s: any) => s.id === nextIdToCheck);
      if (!step || step.type !== "Form") break;
      
      const stepFields = (step.fields ?? []) as FlowFormField[];
      // We append any fields found. The keys usually don't overlap (e.g., measurements, notes vs quantity)
      collectedFields.push(...stepFields);
      
      nextIdToCheck = step.next;
    }
    
    return collectedFields;
  }, [steps, questionId]);

  const handleFormChange = (key: string, value: any) => {
    setDraftForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!draftAnswer || !auditId || !questionId || saving.current) return;
    saving.current = true;
    setSavePending(true);
    setActionError(null);
    setSuccessMessage(null);
    try {

    const updates: AnswerItemUpdate[] = [
      { step_id: questionId, answer: draftAnswer },
    ];

    if (draftAnswer === "NO") {
      const questionStep = steps?.find((s: any) => s.id === questionId);
      const noNextId = questionStep?.no_next ?? questionStep?.noNext;
      
      if (noNextId) {
        // El editor permanece abierto hasta que termine el guardado completo.
        
        const cleanValues: Record<string, unknown> = {};
        
        // 1. Process files if they exist
        for (const [k, v] of Object.entries(draftForm)) {
          if (k.startsWith("__files__")) {
             const fieldId = k.replace("__files__", "");
             const filesToUpload = v as File[];

             if (filesToUpload.length > 0) {
                 // Hit backend uploads lambda
                 try {
                     const uploadReq = {
                         audit_id: auditId,
                         files: filesToUpload.map(f => ({ name: f.name, step_id: noNextId }))
                     };
                     
                     const { data: uploadRes } = await httpClient.post<{ urls: { file_name: string, upload_url: string, file_url: string }[] }>(
                         "/api/uploads",
                         uploadReq
                     );

                     const finalS3Urls: string[] = [];
                     
                     // PUT files
                     for (let i = 0; i < filesToUpload.length; i++) {
                         const file = filesToUpload[i];
                         const presignedInfo = uploadRes.urls.find(u => u.file_name === file.name);
                         if (presignedInfo) {
                             await flowsRepo.uploadFile(presignedInfo.upload_url, file);
                             finalS3Urls.push(presignedInfo.file_url);
                         }
                     }
                     // Map to proper key. If field is 'photo', use 'photos'
                     const targetKey = fieldId === "photo" ? "photos" : fieldId;
                     // In case there were already existing strings under the array, append them
                     const existingUrls = (draftForm[fieldId] || []).filter((u: any) => typeof u === "string" && !u.startsWith("blob:"));
                     cleanValues[targetKey] = [...existingUrls, ...finalS3Urls];
                 } catch (err) {
                     console.error("Failed to upload files:", err);
                     setActionError("Failed to upload files. Your changes are preserved; please try again.");
                     return;
                 }
             }
          }
        }

        // 2. Map remaining fields, ignore 'photo' since we mapped it to 'photos' above!
        for (const [k, v] of Object.entries(draftForm)) {
          if (!k.startsWith("__files__") && k !== "photo") {
            cleanValues[k] = v;
          }
        }
        
        let currentFormId = noNextId;
        let sanity = 0;
        let pushedAnyForm = false;

        while (currentFormId && sanity < 20) {
          sanity++;
          const formStep = steps?.find((s: any) => s.id === currentFormId);
          if (!formStep || formStep.type !== "Form") break;
          
          const formFields = formStep.fields ?? [];
          const formValues: Record<string, unknown> = {};
          
          // Only pull fields defined in this specific form
          for (const field of formFields) {
            const targetKey = field.id === "photo" ? "photos" : field.id;
            if (cleanValues[targetKey] !== undefined) {
              formValues[targetKey] = cleanValues[targetKey];
            }
          }
          
          updates.push({
            step_id: currentFormId,
            type: "form",
            values: formValues,
          });
          pushedAnyForm = true;
          
          currentFormId = formStep.next;
        }

        // Dropback in case anything failed
        if (!pushedAnyForm) {
          updates.push({
            step_id: noNextId,
            type: "form",
            values: cleanValues,
          });
        }
      }
    }

    try {
      await updateAnswer({ auditId, answers: updates });
      setIsEditing(false);
      setSuccessMessage("Answer updated successfully");
    } catch (err) {
      console.error(err);
      setActionError("Failed to update answer. Your changes are preserved; please try again.");
    }
    } finally {
      saving.current = false;
      setSavePending(false);
    }
  };

  const feedback = (
    <>
      {actionError && <p className="mt-4 rounded bg-[var(--kma-danger-bg)] p-3 text-sm text-[var(--kma-danger)]" role="alert">{actionError}</p>}
      {successMessage && <p className="mt-4 text-sm text-[var(--kma-success)]" role="status">{successMessage}</p>}
    </>
  );

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
            "p-4 sm:p-6",
            "border-l-4 border-l-[var(--kma-warning)] bg-[color-mix(in_srgb,var(--kma-warning-bg)_55%,var(--kma-surface))]",
            className
          )}
        >
          <HeroSection
            text={text}
            pill={<SelectionPill label="UNSURE (Editing)" />}
          />
          <NotesSection {...(notes === undefined ? {} : { notes })} />
        {feedback}

          <fieldset disabled={isPending || savePending} aria-label="Answer correction" className="mt-6 border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold">Change Answer</h4>
            <div className="mb-4 flex gap-2">
              <Button
                type="button"
                fullWidth={false}
                variant={draftAnswer === "YES" ? "primary" : "secondary"}
                aria-pressed={draftAnswer === "YES"}
                onClick={() => { setDraftAnswer("YES"); setDraftForm({}); }}
              >YES</Button>
              <Button
                type="button"
                fullWidth={false}
                variant={draftAnswer === "NO" ? "primary" : "secondary"}
                aria-pressed={draftAnswer === "NO"}
                onClick={() => setDraftAnswer("NO")}
              >NO</Button>
            </div>

            {draftAnswer === "NO" && (
              <div className="mb-4 space-y-4 bg-[var(--kma-canvas)] p-4">
                <h5 className="text-sm font-medium">Finding details</h5>
                <DynamicFormFields
                  fields={noNextFormFields}
                  values={draftForm}
                  onChange={handleFormChange}
                />
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                fullWidth={false}
                onClick={handleSave}
                disabled={!draftAnswer || isPending || savePending}
              >
                {(isPending || savePending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                onClick={() => setIsEditing(false)}
                disabled={isPending || savePending}
              >
                Cancel
              </Button>
            </div>
          </fieldset>
        </article>
      );
    }

    return (
      <EvidenceComposition attachments={attachments} {...(onViewAttachment ? { onViewAttachment } : {})} className={cn("border-l-4 border-l-[var(--kma-warning)] bg-[color-mix(in_srgb,var(--kma-warning-bg)_55%,var(--kma-surface))]", className)}>
        <HeroSection text={text} pill={<SelectionPill label="UNSURE" />} />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
        {feedback}
        <div className="mt-4 flex justify-start border-t pt-4">
          <Button
            type="button"
            fullWidth={false}
            variant="secondary"
            onClick={() => { setActionError(null); setSuccessMessage(null); setIsEditing(true); }}
          >
            Resolve Answer...
          </Button>
        </div>
      </EvidenceComposition>
    );
  }

  /* ===== YES ===== */
  if (answeredYes === true) {
    return (
      <EvidenceComposition attachments={attachments} {...(onViewAttachment ? { onViewAttachment } : {})} className={className}>
        <HeroSection text={text} pill={<YesNoPill value={true} />} />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
        {feedback}
      </EvidenceComposition>
    );
  }

  /* ===== NO ===== */
  if (answeredYes === false) {
    return (
      <EvidenceComposition attachments={attachments} {...(onViewAttachment ? { onViewAttachment } : {})} className={className}>
        <HeroSection text={text} pill={<YesNoPill value={false} />} />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
        {feedback}
      </EvidenceComposition>
    );
  }

  /* ===== MULTIPLE CHOICE ===== */
  if (hasChoice) {
    return (
      <EvidenceComposition attachments={attachments} {...(onViewAttachment ? { onViewAttachment } : {})} className={className}>
        <HeroSection
          text={text}
          pill={<SelectionPill label={String(answerValue)} />}
        />
        <NotesSection {...(notes === undefined ? {} : { notes })} />
        {feedback}
      </EvidenceComposition>
    );
  }

  /* ===== GENERAL ===== */
  const hasNotes = typeof notes === "string" && notes.trim().length > 0;
  const hasAnswer =
    answerValue !== undefined &&
    answerValue !== null &&
    (typeof answerValue === "number" || String(answerValue).length > 0);

  return (
    <EvidenceComposition attachments={attachments} {...(onViewAttachment ? { onViewAttachment } : {})} className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {typeof index === "number" ? (
              <span className="text-xs text-[var(--kma-muted)]">#{index}</span>
            ) : null}
            <div
              role="heading"
              aria-level={3}
              className="font-heading break-words text-base font-semibold leading-relaxed"
            >
              {text}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--kma-muted)]">
            <span className="rounded border px-1.5 py-0.5">
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
            <div className="mt-2 text-xs text-[var(--kma-fg)]/90">
              <span className="text-[var(--kma-muted)]">Answer:</span>{" "}
              <span className="font-medium">{String(answerValue)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {hasNotes ? (
        <div className="mt-5 border-t border-[var(--kma-border)] pt-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Notes
          </div>
          <p className="max-w-[65ch] whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--kma-muted)]">{notes}</p>
        </div>
      ) : null}

    </EvidenceComposition>
  );
};
export default memo(AuditQuestionCard);
