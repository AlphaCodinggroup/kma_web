"use client";

import React from "react";
import type {
    Flow,
    FlowStep,
    FormField,
    FormStep,
    QuestionStep,
    SelectStep
} from "@entities/flow/model";
import { Button, Input, Label, Textarea } from "@shared/ui/controls";
import {
    ArrowRight,
    CornerDownRight,
    Plus,
    Trash2,
    ImagePlus,
    X,
    Info
} from "lucide-react";
import { StepSelector } from "./StepSelector";
import { ConditionalNavEditor } from "./ConditionalNavEditor";

export interface StepDetailInspectorProps {
    selectedStep: FlowStep | null;
    flow: Flow;
    onUpdateStep: (stepId: string, updates: Partial<FlowStep>) => void;
    onDeleteStep: (stepId: string) => void;
    onAddStep: (type: FlowStep["type"], autoLinkTo?: { stepId: string; field: string }) => void;
    onAddField: (stepId: string, fieldType: "quantity" | "measurements" | "photo" | "notes") => void;
    onUpdateField: (stepId: string, fieldIndex: number, updates: Partial<FormField>) => void;
    onDeleteField: (stepId: string, fieldIndex: number) => void;
    onAddOption: (stepId: string) => void;
    onUpdateOption: (stepId: string, optionIndex: number, field: string, value: string) => void;
    onDeleteOption: (stepId: string, optionIndex: number) => void;
    onImageClick: () => void;
    onRemoveImage: (stepId: string, indexToRemove: number) => void;
    onZoomImage: (url: string) => void;
    isAdmin: boolean;
}

export const StepDetailInspector: React.FC<StepDetailInspectorProps> = ({
    selectedStep,
    flow,
    onUpdateStep,
    onDeleteStep,
    onAddStep,
    onAddField,
    onUpdateField,
    onDeleteField,
    onAddOption,
    onUpdateOption,
    onDeleteOption,
    onImageClick,
    onRemoveImage,
    onZoomImage,
    isAdmin
}) => {
    const baseId = React.useId();
    const [unavailableImages, setUnavailableImages] = React.useState<Set<string>>(() => new Set());
    const controlId = (field: string) => `${baseId}-${field}`;

    if (!selectedStep) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-[var(--kma-muted)] bg-[var(--kma-surface)] text-center">
                <CornerDownRight className="h-8 w-8 mb-2 opacity-30 text-[var(--kma-muted)]" />
                <p className="text-sm font-medium text-[var(--kma-muted)]">No step selected</p>
                <p className="text-xs text-[var(--kma-muted)] mt-1">Select a step from the sidebar to edit</p>
            </div>
        );
    }

    const images = selectedStep.images || [];

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 bg-[var(--kma-surface)] overflow-hidden">
            <div className="shrink-0 border-b border-[var(--kma-border)] bg-[var(--kma-subtle)] px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="break-all text-xl font-semibold leading-7 text-[var(--kma-fg)]">{selectedStep.id}</h2>
                            <span className="border border-[var(--kma-border)] px-2 py-1 text-xs font-medium text-[var(--kma-muted)]">{selectedStep.type}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--kma-muted)]">Editing step details</p>
                    </div>
                    {isAdmin ? <button type="button" onClick={() => onDeleteStep(selectedStep.id)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[color-mix(in_srgb,var(--kma-danger)_10%,transparent)] hover:text-[var(--kma-danger)]" title="Delete current step" aria-label="Delete current step"><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl space-y-6">
                {/* STEP ID EDITABLE */}
                <div>
                    <Label htmlFor={controlId("step-id")} className="text-sm font-medium text-[var(--kma-fg)] block mb-1.5">
                        Step ID
                    </Label>
                    <Input
                        id={controlId("step-id")}
                        value={selectedStep.id}
                        disabled={!isAdmin}
                        onChange={(e) => onUpdateStep(selectedStep.id, { id: e.target.value })}
                    />
                </div>

                {/* FORM STEP VIEW */}
                {selectedStep.type === "Form" && (
                    <>
                        {/* TITLE */}
                        <div>
                            <Label htmlFor={controlId("title")} className="text-sm font-medium text-[var(--kma-fg)] block mb-1.5">
                                Title
                            </Label>
                            <Input
                                id={controlId("title")}
                                value={(selectedStep as FormStep).title}
                                disabled={!isAdmin}
                                onChange={(e) => onUpdateStep(selectedStep.id, { title: e.target.value })}
                                placeholder="Form step title..."
                                className="font-medium"
                            />
                        </div>

                        {/* NEXT STEP */}
                        <div>
                            <Label htmlFor={controlId("next")} className="text-sm font-medium text-[var(--kma-fg)] block mb-1.5">
                                Next Step
                            </Label>
                            <StepSelector
                                id={controlId("next")}
                                value={(selectedStep as FormStep).next}
                                onChange={(id) => onUpdateStep(selectedStep.id, { ...selectedStep, next: id } as FormStep)}
                                stepId={selectedStep.id}
                                field="next"
                                flow={flow}
                                selectedStep={selectedStep}
                                onAddStep={onAddStep}
                                disabled={!isAdmin}
                            />
                        </div>

                        {/* EVIDENCE FIELDS */}
                        <div className="space-y-3 pt-2">
                            <Label className="text-sm font-semibold text-[var(--kma-fg)] block">
                                Fields
                            </Label>

                            <div className="space-y-4">
                                {/* Botones de acción rápida: + Quantity, + Measurement, + Photo, + Notes */}
                                {isAdmin && (
                                    <div className="flex flex-row flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onAddField(selectedStep.id, "quantity")}
                                            disabled={(selectedStep as FormStep).fields.some((f) => f.id === "quantity")}
                                            className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--kma-border)] px-3 text-sm font-medium text-[var(--kma-fg)] transition-colors hover:bg-[var(--kma-subtle)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Quantity
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAddField(selectedStep.id, "measurements")}
                                            className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--kma-border)] px-3 text-sm font-medium text-[var(--kma-fg)] transition-colors hover:bg-[var(--kma-subtle)] sm:min-h-10"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Measurement
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAddField(selectedStep.id, "photo")}
                                            disabled={(selectedStep as FormStep).fields.some((f) => f.id === "photo")}
                                            className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--kma-border)] px-3 text-sm font-medium text-[var(--kma-fg)] transition-colors hover:bg-[var(--kma-subtle)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Photo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAddField(selectedStep.id, "notes")}
                                            disabled={(selectedStep as FormStep).fields.some((f) => f.id === "notes")}
                                            className="inline-flex min-h-11 items-center justify-center rounded border border-[var(--kma-border)] px-3 text-sm font-medium text-[var(--kma-fg)] transition-colors hover:bg-[var(--kma-subtle)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Notes
                                        </button>
                                    </div>
                                )}

                                {/* Form Fields List */}
                                <div className="space-y-2">
                                    {(selectedStep as FormStep).fields.map((field, fIdx) => (
                                        <div key={fIdx} className="flex flex-col gap-3 border-t border-[var(--kma-border)] py-4">
                                            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                                                <div className="col-span-3 text-xs text-[var(--kma-muted)] shrink-0">{field.type}</div>
                                                <Input
                                                    aria-label={`Field ${fIdx + 1} label`}
                                                    className="min-w-0 flex-1 bg-[var(--kma-surface)]"
                                                    value={field.label}
                                                    disabled={!isAdmin}
                                                    onChange={(e) => onUpdateField(selectedStep.id, fIdx, { label: e.target.value })}
                                                />
                                                {field.id.startsWith("measurements") && (
                                                    <select
                                                        aria-label={`Field ${fIdx + 1} unit`}
                                                        value={field.unit ?? '"'}
                                                        disabled={!isAdmin}
                                                        onChange={(e) => onUpdateField(selectedStep.id, fIdx, { unit: e.target.value })}
                                                        className="min-h-11 sm:min-h-10 text-base sm:text-sm border border-[var(--kma-border)] rounded px-2 bg-[var(--kma-surface)] shrink-0"
                                                    >
                                                        <option value={'"'}>in (&quot;)</option>
                                                        <option value={"cm"}>cm</option>
                                                        <option value={"%"}>%</option>
                                                    </select>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteField(selectedStep.id, fIdx)}
                                                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-surface)] hover:text-[var(--kma-danger)]"
                                                        title="Delete field"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            {(field.type === "text" || field.type === "number") && (
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                    <div className="sm:w-20 text-xs text-[var(--kma-muted)] shrink-0 sm:text-right sm:pr-2">Placeholder</div>
                                                    <Input
                                                        className="min-w-0 flex-1 bg-[var(--kma-surface)]"
                                                        placeholder="Optional placeholder..."
                                                        aria-label={`Field ${fIdx + 1} placeholder`}
                                                        value={field.placeholder ?? ""}
                                                        disabled={!isAdmin}
                                                        onChange={(e) => onUpdateField(selectedStep.id, fIdx, { placeholder: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SHARED QUANTITY INFO */}
                        <div className="border-t border-[var(--kma-border)] pt-5 space-y-2">
                            <Label className="text-sm font-semibold text-[var(--kma-fg)] block">
                                Shared Quantity
                            </Label>
                            <div className="rounded bg-[var(--kma-subtle)] p-4 text-sm leading-6 text-[var(--kma-muted)]">
                                <Info className="h-3.5 w-3.5 inline mr-1 text-[var(--kma-primary)]" />
                                Barrier IDs will be calculated and saved automatically when you click &quot;Save Flow&quot;.
                                <br />
                                <span>
                                    Current detected barriers (saved):{" "}
                                    <strong className="font-semibold">
                                        {(selectedStep as FormStep).metadata?.sharedQuantity?.appliesToBarriers?.join(", ") || "(None)"}
                                    </strong>
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* QUESTION STEP VIEW */}
                {selectedStep.type === "Question" && (
                    <>
                        {/* QUESTION TEXT */}
                        <div>
                            <Label htmlFor={controlId("question-text")} className="text-sm font-medium text-[var(--kma-fg)] block mb-1.5">
                                Question Text
                            </Label>
                            <Textarea
                                id={controlId("question-text")}
                                value={(selectedStep as QuestionStep).text}
                                disabled={!isAdmin}
                                onChange={(e) => onUpdateStep(selectedStep.id, { text: e.target.value })}
                                placeholder="Enter question text"
                                rows={3}
                                className="leading-relaxed"
                            />
                        </div>

                        {/* ROUTING: YES & NO */}
                        <div className="space-y-3 pt-2">
                            <Label className="text-sm font-semibold text-[var(--kma-fg)] block">
                                Routing
                            </Label>

                            {/* YES Next */}
                            <div className="space-y-1">
                                <Label htmlFor={controlId("yes-next")} className="flex items-center gap-1 text-sm font-medium text-[var(--kma-fg)] cursor-pointer">
                                    Yes <ArrowRight className="h-3 w-3 inline" />
                                </Label>
                                <StepSelector
                                    id={controlId("yes-next")}
                                    value={(selectedStep as QuestionStep).yesNext}
                                    onChange={(id) =>
                                        onUpdateStep(selectedStep.id, { ...selectedStep, yesNext: id } as QuestionStep)
                                    }
                                    stepId={selectedStep.id}
                                    field="yesNext"
                                    flow={flow}
                                    selectedStep={selectedStep}
                                    onAddStep={onAddStep}
                                    disabled={!isAdmin}
                                />
                            </div>

                            {/* NO Next */}
                            <div className="space-y-1">
                                <Label htmlFor={controlId("no-next")} className="flex items-center gap-1 text-sm font-medium text-[var(--kma-fg)] cursor-pointer">
                                    No <ArrowRight className="h-3 w-3 inline" />
                                </Label>
                                <StepSelector
                                    id={controlId("no-next")}
                                    value={(selectedStep as QuestionStep).noNext}
                                    onChange={(id) =>
                                        onUpdateStep(selectedStep.id, { ...selectedStep, noNext: id } as QuestionStep)
                                    }
                                    stepId={selectedStep.id}
                                    field="noNext"
                                    flow={flow}
                                    selectedStep={selectedStep}
                                    onAddStep={onAddStep}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* BARRIER ID */}
                        <div className="pt-2">
                            <Label htmlFor={controlId("barrier-id")} className="text-sm font-medium text-[var(--kma-fg)] block mb-1">
                                Barrier ID
                            </Label>
                            <Input
                                id={controlId("barrier-id")}
                                value={(selectedStep as QuestionStep).barrierId || ""}
                                disabled={!isAdmin}
                                onChange={(e) =>
                                    onUpdateStep(selectedStep.id, { ...selectedStep, barrierId: e.target.value } as QuestionStep)
                                }
                                placeholder="e.g. AR-B01"
                                                            />
                        </div>

                        {/* Conditional YES Navigation */}
                        <ConditionalNavEditor
                            label="Conditional YES Navigation"
                            description="Alternate navigation when YES is answered AND conditions are met"
                            conditional={(selectedStep as QuestionStep).conditionalYesNext}
                            onChange={(conditionalYesNext) =>
                                onUpdateStep(selectedStep.id, { ...selectedStep, conditionalYesNext } as QuestionStep)
                            }
                            currentStepId={selectedStep.id}
                            flow={flow}
                            disabled={!isAdmin}
                        />

                        {/* Conditional NO Navigation */}
                        <ConditionalNavEditor
                            label="Conditional NO Navigation"
                            description="Alternate navigation when NO is answered AND conditions are met"
                            conditional={(selectedStep as QuestionStep).conditionalNoNext}
                            onChange={(conditionalNoNext) =>
                                onUpdateStep(selectedStep.id, { ...selectedStep, conditionalNoNext } as QuestionStep)
                            }
                            currentStepId={selectedStep.id}
                            flow={flow}
                            disabled={!isAdmin}
                        />
                    </>
                )}

                {/* SELECT STEP VIEW */}
                {selectedStep.type === "Select" && (
                    <>
                        {/* TITLE / TEXT */}
                        <div>
                            <Label htmlFor={controlId("select-text")} className="text-sm font-medium text-[var(--kma-fg)] block mb-1.5">
                                Title / Text
                            </Label>
                            <Textarea
                                id={controlId("select-text")}
                                value={(selectedStep as SelectStep).title || (selectedStep as SelectStep).text || ""}
                                disabled={!isAdmin}
                                onChange={(e) =>
                                    onUpdateStep(selectedStep.id, { title: e.target.value, text: e.target.value })
                                }
                                placeholder="Select prompt title..."
                                rows={2}
                                className="leading-relaxed"
                            />
                        </div>

                        {/* OPTIONS LIST */}
                        <div className="space-y-3 pt-2">
                            <Label className="text-sm font-semibold text-[var(--kma-fg)] block">
                                Options
                            </Label>

                            <div className="space-y-3">
                                {(selectedStep as SelectStep).options.map((option, idx) => (
                                    <div
                                        key={idx}
                                        className="border-t border-[var(--kma-border)] py-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-[var(--kma-fg)]">Option {idx + 1}</p>
                                            {isAdmin ? <button type="button" onClick={() => onDeleteOption(selectedStep.id, idx)} className="inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-subtle)] hover:text-[var(--kma-danger)]" title="Delete option" aria-label={`Delete option ${idx + 1}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : null}
                                        </div>
                                        <div>
                                            <span className="block mb-1 text-sm font-medium text-[var(--kma-fg)]">Label</span>
                                            <Input
                                                aria-label={`Option ${idx + 1} label`}
                                                value={option.label}
                                                disabled={!isAdmin}
                                                onChange={(e) =>
                                                    onUpdateOption(selectedStep.id, idx, "label", e.target.value)
                                                }
                                                className="bg-[var(--kma-surface)]"
                                            />
                                        </div>

                                        <div>
                                            <span className="text-sm font-medium text-[var(--kma-fg)] block mb-1">Next step</span>
                                            <StepSelector
                                                ariaLabel={`Option ${idx + 1} next step`}
                                                value={option.next}
                                                onChange={(val) => onUpdateOption(selectedStep.id, idx, "next", val)}
                                                stepId={selectedStep.id}
                                                field={`option:${idx}`}
                                                flow={flow}
                                                selectedStep={selectedStep}
                                                onAddStep={onAddStep}
                                                disabled={!isAdmin}
                                            />
                                        </div>

                                        <div>
                                            <span className="text-sm font-medium text-[var(--kma-fg)] block mb-1">Barrier ID</span>
                                            <Input
                                                aria-label={`Option ${idx + 1} barrier ID`}
                                                value={option.barrierId || ""}
                                                disabled={!isAdmin}
                                                onChange={(e) =>
                                                    onUpdateOption(selectedStep.id, idx, "barrierId", e.target.value)
                                                }
                                                placeholder="Optional Barrier ID"
                                                className="bg-[var(--kma-surface)]"
                                            />
                                        </div>

                                    </div>
                                ))}

                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => onAddOption(selectedStep.id)}
                                        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded border border-[var(--kma-border)] px-3 text-sm font-medium text-[var(--kma-fg)] transition-colors hover:bg-[var(--kma-subtle)] sm:min-h-10"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add Option</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* END STEP VIEW */}
                {selectedStep.type === "End" && (
                    <div className="p-4 bg-[var(--kma-subtle)] border border-[var(--kma-border)] rounded text-xs text-[var(--kma-muted)] space-y-2">
                        <p className="font-semibold text-[var(--kma-fg)]">End Step</p>
                        <p>This step terminates and completes the flow process when reached by an auditor.</p>
                    </div>
                )}
                {images.length > 0 || isAdmin ? (
                    <section className="space-y-4 border-t border-[var(--kma-brand-border)] pt-5" aria-label="Reference images">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-[var(--kma-fg)]">Reference images</h3>
                            {isAdmin ? <Button type="button" variant="secondary" fullWidth={false} onClick={onImageClick} title={images.length ? "Add another photo" : "Add reference image"}><ImagePlus className="h-4 w-4" aria-hidden="true" />Add Image</Button> : null}
                        </div>
                        {images.length ? <div className="flex flex-wrap gap-4">{images.map((url, index) => (
                            <div key={index} className="relative">
                                <button type="button" onClick={() => onZoomImage(url)} className="block overflow-hidden rounded border border-[var(--kma-brand-border)] bg-[var(--kma-brand)]" aria-label={`View reference image ${index + 1}`} disabled={unavailableImages.has(url)}>
                                    {unavailableImages.has(url) ? <span className="flex h-32 w-44 items-end justify-center bg-[var(--kma-subtle)] px-2 pb-3 text-xs text-[var(--kma-muted)]">Image unavailable</span> : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={url} alt={`Ref ${index}`} className="h-32 w-44 object-cover" onError={() => setUnavailableImages((current) => new Set(current).add(url))} />
                                    )}
                                </button>
                                {isAdmin ? <button type="button" onClick={() => onRemoveImage(selectedStep.id, index)} title="Remove photo" aria-label={`Remove reference image ${index + 1}`} className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded bg-[var(--kma-surface)] text-[var(--kma-danger)]"><X className="h-4 w-4" aria-hidden="true" /></button> : null}
                            </div>
                        ))}</div> : <p className="text-sm text-[var(--kma-muted)]">Add photos that help auditors recognize what to inspect.</p>}
                    </section>
                ) : null}
            </div>
            </div>
        </div>
    );
};
