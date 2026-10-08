"use client";

import React from "react";
import type { Flow, FlowStep, FormStep, QuestionStep, SelectStep } from "@entities/flow/model";
import { Button, Input } from "@shared/ui/controls";
import {
    Search,
    GripVertical,
    AlertTriangle,
    Trash2,
    Plus,
    ArrowRight
} from "lucide-react";
import { cn } from "@shared/lib/cn";

// Chips de estado: colores sólidos del tema (nunca mezclas translúcidas) para que el contraste se mida sobre un fondo fijo.
const CHIP = "inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium break-all";
const TONE = {
    success: "border-[var(--kma-success-border)] bg-[var(--kma-success-bg)] text-[var(--kma-success)]",
    danger: "border-[var(--kma-danger-border)] bg-[var(--kma-danger-bg)] text-[var(--kma-danger)]",
    warning: "border-[var(--kma-warning-border)] bg-[var(--kma-warning-bg)] text-[var(--kma-warning)]",
    info: "border-[var(--kma-info-border)] bg-[var(--kma-info-bg)] text-[var(--kma-info)]",
    neutral: "border-[var(--kma-border)] bg-[var(--kma-subtle)] text-[var(--kma-fg)]",
} as const;

const STEP_TYPES = [
    { type: "Question", icon: "text-[var(--kma-primary)]" },
    { type: "Form", icon: "text-[var(--kma-success)]" },
    { type: "Select", icon: "text-[var(--kma-info)]" },
    { type: "End", icon: "text-[var(--kma-muted)]" },
] as const;

export interface FlowStepsTableProps {
    flow: Flow;
    selectedStepId: string | null;
    onSelectStep: (stepId: string) => void;
    onDeleteStep: (stepId: string) => void;
    onAddStep: (type: FlowStep["type"]) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    isAdmin: boolean;
    draggedStepId: string | null;
    dragOverStepId: string | null;
    onDragStart: (e: React.DragEvent<HTMLTableRowElement>, stepId: string) => void;
    onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDragEnter: (e: React.DragEvent<HTMLTableRowElement>, stepId: string) => void;
    onDragLeave: (e: React.DragEvent<HTMLTableRowElement>, stepId: string) => void;
    onDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDrop: (e: React.DragEvent<HTMLTableRowElement>, stepId: string) => void;
    isStepIncomplete: (step: FlowStep) => boolean;
    /** `table` es la vista ancha de escritorio; `list` la compacta del cajón móvil. */
    layout?: "table" | "list";
}

export const FlowStepsTable: React.FC<FlowStepsTableProps> = ({
    flow,
    selectedStepId,
    onSelectStep,
    onDeleteStep,
    onAddStep,
    searchTerm,
    onSearchChange,
    isAdmin,
    draggedStepId,
    dragOverStepId,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDragEnd,
    onDrop,
    isStepIncomplete,
    layout = "table",
}) => {
    const filteredSteps = flow.steps.filter((s) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        if (s.id.toLowerCase().includes(term)) return true;
        if (s.type.toLowerCase().includes(term)) return true;
        if (s.type === "Question" && (s as QuestionStep).text.toLowerCase().includes(term)) return true;
        if (s.type === "Form" && (s as FormStep).title.toLowerCase().includes(term)) return true;
        if (s.type === "Select") {
            const selectStep = s as SelectStep;
            const titleOrText = selectStep.title || selectStep.text || "";
            return titleOrText.toLowerCase().includes(term);
        }
        return false;
    });

    // Helper para obtener las barreras asociadas
    const getBarrierIds = (step: FlowStep): string => {
        if (step.type === "Question") {
            return (step as QuestionStep).barrierId || "";
        }
        if (step.type === "Form") {
            const formStep = step as FormStep;
            if (formStep.barrierId) return formStep.barrierId;
            if (formStep.metadata?.sharedQuantity?.appliesToBarriers?.length) {
                return formStep.metadata.sharedQuantity.appliesToBarriers.join(", ");
            }
            return "";
        }
        if (step.type === "Select") {
            const selectStep = step as SelectStep;
            const barrierIds = selectStep.options
                .map((o) => o.barrierId)
                .filter((b): b is string => Boolean(b));
            return Array.from(new Set(barrierIds)).join(", ");
        }
        return "";
    };

    // Render del ruteo visual (Routing badges)
    const renderRouting = (step: FlowStep) => {
        if (step.type === "Question") {
            const q = step as QuestionStep;
            return (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(CHIP, q.yesNext ? TONE.success : TONE.warning)} title={q.yesNext ? `YES leads to ${q.yesNext}` : "Missing YES link"}>
                        YES <ArrowRight className="inline h-3 w-3" aria-hidden="true" /> {q.yesNext || "Missing"}
                    </span>
                    <span className={cn(CHIP, q.noNext ? TONE.danger : TONE.warning)} title={q.noNext ? `NO leads to ${q.noNext}` : "Missing NO link"}>
                        NO <ArrowRight className="inline h-3 w-3" aria-hidden="true" /> {q.noNext || "Missing"}
                    </span>
                    {(q.conditionalYesNext || q.conditionalNoNext) && (
                        <span className={cn(CHIP, TONE.info, "font-semibold")} title="Has conditional navigation">
                            COND
                        </span>
                    )}
                </div>
            );
        }

        if (step.type === "Form") {
            const f = step as FormStep;
            return f.next ? (
                <span className={cn(CHIP, TONE.neutral)} title={`Proceeds to ${f.next}`}>
                    NEXT <ArrowRight className="inline h-3 w-3" aria-hidden="true" /> {f.next}
                </span>
            ) : (
                <span className={cn(CHIP, TONE.warning)}>Missing next step</span>
            );
        }

        if (step.type === "Select") {
            const s = step as SelectStep;
            if (s.options.length === 0) {
                return <span className={cn(CHIP, TONE.warning)}>No options</span>;
            }
            return (
                <div className="flex flex-wrap items-center gap-1.5">
                    {s.options.slice(0, 2).map((opt, idx) => (
                        <span
                            key={idx}
                            className={cn(CHIP, "max-w-[170px]", opt.next ? TONE.info : TONE.warning)}
                            title={`${opt.label} -> ${opt.next || "Missing"}`}
                        >
                            <span className="truncate">{opt.label}</span>
                            <ArrowRight className="inline h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="shrink-0">{opt.next || "?"}</span>
                        </span>
                    ))}
                    {s.options.length > 2 && (
                        <span className="px-1 text-xs text-[var(--kma-muted)]">+{s.options.length - 2} more</span>
                    )}
                </div>
            );
        }

        return <span className={cn(CHIP, TONE.neutral)}>END</span>;
    };

    const stepTitle = (step: FlowStep) =>
        step.type === "Question" ? step.text
            : step.type === "Form" ? step.title
            : step.type === "Select" ? step.title || step.text || "Select Options"
            : "End of flow";

    const isTable = layout === "table";
    const draggable = searchTerm === "" && isAdmin;

    const rowHandlers = (step: FlowStep) => ({
        draggable,
        onDragStart: (e: React.DragEvent<HTMLTableRowElement>) => onDragStart(e, step.id),
        onDragOver,
        onDrop: (e: React.DragEvent<HTMLTableRowElement>) => onDrop(e, step.id),
        onDragEnter: (e: React.DragEvent<HTMLTableRowElement>) => onDragEnter(e, step.id),
        onDragLeave: (e: React.DragEvent<HTMLTableRowElement>) => onDragLeave(e, step.id),
        onDragEnd,
        onClick: () => onSelectStep(step.id),
    });

    const rowTone = (step: FlowStep, isSelected: boolean, incomplete: boolean, isDuplicateId: boolean) =>
        cn(
            "group cursor-pointer border-l-4 transition-colors",
            isSelected
                ? "border-l-[var(--kma-selected-edge)] bg-[var(--kma-selected)]"
                : "border-l-transparent hover:bg-[var(--kma-subtle)]",
            incomplete && !isSelected && "bg-[color-mix(in_srgb,var(--kma-warning-bg)_60%,var(--kma-surface))]",
            isDuplicateId && !isSelected && "bg-[color-mix(in_srgb,var(--kma-danger-bg)_60%,var(--kma-surface))]",
            draggedStepId === step.id && "opacity-40",
            dragOverStepId === step.id && "bg-[var(--kma-info-bg)] shadow-[inset_0_2px_0_var(--kma-info)]"
        );

    const deleteButton = (step: FlowStep) => (
        <button
            type="button"
            disabled={!isAdmin}
            onClick={(e) => { e.stopPropagation(); if (isAdmin) onDeleteStep(step.id); }}
            aria-label={`Delete step ${step.id}`}
            title={!isAdmin ? "Only administrators can delete steps" : "Delete step"}
            className={cn(
                "inline-flex h-[var(--kma-control-height)] w-[var(--kma-control-height)] shrink-0 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[var(--kma-danger-bg)] hover:text-[var(--kma-danger)] disabled:cursor-not-allowed disabled:opacity-40",
                isTable && "fine-desktop:opacity-0 fine-desktop:group-hover:opacity-100 fine-desktop:group-focus-within:opacity-100 fine-desktop:focus-visible:opacity-100"
            )}
        >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
    );

    const idMarks = (step: FlowStep, incomplete: boolean, isDuplicateId: boolean) => (
        <>
            {isDuplicateId ? (
                <span className={cn(CHIP, TONE.danger, "font-semibold")} title="Duplicate ID: Each step must have a unique ID">
                    DUP<span className="sr-only"> Duplicate ID</span>
                </span>
            ) : null}
            {incomplete ? (
                <span title="Incomplete: missing step references">
                    <AlertTriangle className="h-4 w-4 text-[var(--kma-warning)]" aria-hidden="true" />
                    <span className="sr-only">Incomplete step</span>
                </span>
            ) : null}
        </>
    );

    const header = (
        <div className="kma-theme-panel shrink-0 space-y-3 border-b border-[var(--kma-brand-border)] bg-[var(--kma-brand)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    {isTable ? <h2 className="text-base font-semibold text-[var(--kma-brand-fg)]">Flow Steps</h2> : null}
                    <p className="text-xs text-[var(--kma-brand-muted)]">{filteredSteps.length} of {flow.steps.length} total steps</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {STEP_TYPES.map(({ type, icon }) => (
                        <Button key={type} type="button" variant="secondary" fullWidth={false} disabled={!isAdmin} onClick={() => onAddStep(type)} className="px-2.5 text-xs" title={!isAdmin ? "Only administrators can add steps" : `Add ${type} step`}>
                            <Plus className={cn("h-3.5 w-3.5 shrink-0", icon)} aria-hidden="true" />{type}
                        </Button>
                    ))}
                </div>
            </div>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kma-muted)]" aria-hidden="true" />
                <Input value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search steps..." aria-label="Search steps" className="pl-9" />
            </div>
        </div>
    );

    const emptyState = (
        <div className="px-4 py-10 text-center text-[var(--kma-muted)]">
            <p className="font-medium text-[var(--kma-fg)]">{searchTerm ? "No matching steps" : "Add your first step"}</p>
            <p className="mt-1 text-xs">{searchTerm ? "No steps match your search criteria." : "Choose a step type above to start your flow."}</p>
        </div>
    );

    if (!isTable) {
        return (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--kma-surface)]" data-testid="flow-steps-panel">
                {header}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <table className="w-full table-fixed border-collapse text-left" aria-label="Flow step sequence">
                        <tbody className="divide-y divide-[var(--kma-border)] text-sm">
                            {filteredSteps.length === 0 ? (
                                <tr><td>{emptyState}</td></tr>
                            ) : filteredSteps.map((step, index) => {
                                const isSelected = selectedStepId === step.id;
                                const incomplete = isStepIncomplete(step);
                                const barriers = getBarrierIds(step);
                                const isDuplicateId = flow.steps.filter((s) => s.id === step.id).length > 1;
                                return (
                                    <tr key={`${step.id}-${index}`} {...rowHandlers(step)} className={rowTone(step, isSelected, incomplete, isDuplicateId)}>
                                        <td className="px-4 py-4">
                                            <div className="flex items-start gap-2">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); onSelectStep(step.id); }} aria-label={`Select step ${step.id}`} aria-current={isSelected ? "step" : undefined} className="min-h-11 min-w-0 flex-1 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--kma-primary)]">
                                                    <span className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--kma-muted)]"><span>Step {flow.steps.indexOf(step) + 1}</span><span>{step.type}</span></span>
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        {draggable ? <span title="Drag to reorder" className="cursor-grab text-[var(--kma-muted)]"><GripVertical className="h-4 w-4" aria-hidden="true" /></span> : null}
                                                        <span className="font-bold break-all text-[var(--kma-fg)]">{step.id}</span>
                                                    </span>
                                                    <span className="mt-1.5 block break-words text-sm leading-5 text-[var(--kma-fg)]">{stepTitle(step) || "Untitled step"}</span>
                                                </button>
                                                {deleteButton(step)}
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">{idMarks(step, incomplete, isDuplicateId)}</div>
                                            <div className="mt-2 space-y-2">{renderRouting(step)}
                                                {barriers ? <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--kma-muted)]"><span>Barriers:</span>{barriers.split(", ").map((barrier) => <span key={barrier} className="break-all">{barrier}</span>)}</div> : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]" data-testid="flow-steps-panel">
            {header}
            <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm" aria-label="Flow step sequence">
                    <thead>
                        <tr className="text-xs font-semibold uppercase tracking-wider text-[var(--kma-muted)]">
                            {[
                                ["ID", "w-[140px] px-4"],
                                ["Type", "w-[100px] px-3"],
                                ["Question / Title", "min-w-[200px] px-3"],
                                ["Routing", "min-w-[220px] px-3"],
                                ["Barriers", "w-[120px] px-3"],
                            ].map(([label, cls]) => (
                                <th key={label} scope="col" className={cn("sticky top-0 z-10 bg-[var(--kma-subtle)] py-3 shadow-[inset_0_-1px_0_var(--kma-border)]", cls)}>{label}</th>
                            ))}
                            <th scope="col" className="sticky top-0 z-10 w-12 bg-[var(--kma-subtle)] py-3 shadow-[inset_0_-1px_0_var(--kma-border)]"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--kma-border)]">
                        {filteredSteps.length === 0 ? (
                            <tr><td colSpan={6}>{emptyState}</td></tr>
                        ) : filteredSteps.map((step, index) => {
                            const isSelected = selectedStepId === step.id;
                            const incomplete = isStepIncomplete(step);
                            const barriers = getBarrierIds(step);
                            const isDuplicateId = flow.steps.filter((s) => s.id === step.id).length > 1;
                            return (
                                <tr key={`${step.id}-${index}`} {...rowHandlers(step)} className={rowTone(step, isSelected, incomplete, isDuplicateId)}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {draggable ? <span title="Drag to reorder" className="-ml-1 cursor-grab text-[var(--kma-muted)]"><GripVertical className="h-4 w-4" aria-hidden="true" /></span> : null}
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onSelectStep(step.id); }} aria-label={`Select step ${step.id}`} aria-current={isSelected ? "step" : undefined} className="min-h-[var(--kma-control-height)] rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kma-primary)]">
                                                <span className="whitespace-nowrap font-bold tabular-nums text-[var(--kma-fg)]">{step.id}</span>
                                            </button>
                                            {idMarks(step, incomplete, isDuplicateId)}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3"><span className={cn(CHIP, TONE.neutral, "whitespace-nowrap break-normal font-semibold")}>{step.type}</span></td>
                                    <td className="px-3 py-3"><div className="line-clamp-2 leading-relaxed text-[var(--kma-fg)]">{stepTitle(step)}</div></td>
                                    <td className="px-3 py-3">{renderRouting(step)}</td>
                                    <td className="px-3 py-3">
                                        {barriers ? (
                                            <div className="flex flex-wrap gap-1">{barriers.split(", ").map((b) => <span key={b} className={cn(CHIP, TONE.neutral)}>{b}</span>)}</div>
                                        ) : (
                                            <><span aria-hidden="true" className="text-[var(--kma-muted)]">-</span><span className="sr-only">None</span></>
                                        )}
                                    </td>
                                    <td className="px-2 py-1 text-right">{deleteButton(step)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
