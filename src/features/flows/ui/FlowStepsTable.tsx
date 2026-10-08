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
                    <span
                        className={cn(
                            "inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium break-all",
                            q.yesNext
                                ? "border-[var(--kma-success)]/60 bg-[color-mix(in_srgb,var(--kma-success)_10%,transparent)] text-[var(--kma-success)]"
                                : "border-[var(--kma-warning)] bg-[color-mix(in_srgb,var(--kma-warning)_10%,transparent)] text-[var(--kma-warning)]"
                        )}
                        title={q.yesNext ? `YES leads to ${q.yesNext}` : "Missing YES link"}
                    >
                        YES <ArrowRight className="h-3 w-3 inline" /> {q.yesNext || "Missing"}
                    </span>
                    <span
                        className={cn(
                            "inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium break-all",
                            q.noNext
                                ? "border-[var(--kma-border)] bg-[var(--kma-subtle)] text-[var(--kma-muted)]"
                                : "border-[var(--kma-warning)] bg-[color-mix(in_srgb,var(--kma-warning)_10%,transparent)] text-[var(--kma-warning)]"
                        )}
                        title={q.noNext ? `NO leads to ${q.noNext}` : "Missing NO link"}
                    >
                        NO <ArrowRight className="h-3 w-3 inline" /> {q.noNext || "Missing"}
                    </span>
                    {(q.conditionalYesNext || q.conditionalNoNext) && (
                        <span
                            className="text-xs px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--kma-primary)_10%,transparent)] text-[var(--kma-primary)] border border-[var(--kma-primary)] font-semibold"
                            title="Has conditional navigation"
                        >
                            COND
                        </span>
                    )}
                </div>
            );
        }

        if (step.type === "Form") {
            const f = step as FormStep;
            return (
                <div className="flex items-center">
                    {f.next ? (
                        <span
                            className="inline-flex max-w-full items-center gap-1 rounded border border-[var(--kma-border)] bg-[var(--kma-subtle)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--kma-muted)] break-all"
                            title={`Proceeds to ${f.next}`}
                        >
                            NEXT <ArrowRight className="h-3 w-3 inline" /> {f.next}
                        </span>
                    ) : (
                        <span className="text-xs px-2.5 py-1 rounded border border-[var(--kma-warning)] bg-[color-mix(in_srgb,var(--kma-warning)_10%,transparent)] text-[var(--kma-warning)] font-medium">
                            Missing next step
                        </span>
                    )}
                </div>
            );
        }

        if (step.type === "Select") {
            const s = step as SelectStep;
            if (s.options.length === 0) {
                return (
                    <span className="text-xs px-2.5 py-1 rounded border border-[var(--kma-warning)] bg-[color-mix(in_srgb,var(--kma-warning)_10%,transparent)] text-[var(--kma-warning)] font-medium">
                        No options
                    </span>
                );
            }

            return (
                <div className="flex flex-wrap items-center gap-1.5">
                    {s.options.slice(0, 2).map((opt, idx) => (
                        <span
                            key={idx}
                            className={cn(
                                "text-xs px-2 py-0.5 rounded border font-medium flex items-center gap-1 max-w-[170px] truncate",
                                opt.next
                                    ? "border-[var(--kma-primary)] bg-[color-mix(in_srgb,var(--kma-primary)_10%,transparent)]/60 text-[var(--kma-primary)]"
                                    : "border-[var(--kma-warning)] bg-[color-mix(in_srgb,var(--kma-warning)_10%,transparent)] text-[var(--kma-warning)]"
                            )}
                            title={`${opt.label} -> ${opt.next || "Missing"}`}
                        >
                            <span className="truncate">{opt.label}</span>
                            <ArrowRight className="h-3 w-3 inline shrink-0" />
                            <span className="shrink-0">{opt.next || "?"}</span>
                        </span>
                    ))}
                    {s.options.length > 2 && (
                        <span className="text-xs text-[var(--kma-muted)] px-1">
                            +{s.options.length - 2} more
                        </span>
                    )}
                </div>
            );
        }

        if (step.type === "End") {
            return (
                <span className="text-xs px-2.5 py-1 rounded border border-[var(--kma-border)] bg-[var(--kma-subtle)] text-[var(--kma-muted)] font-medium">
                    END
                </span>
            );
        }

        return null;
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--kma-surface)]" data-testid="flow-steps-panel">
            <div className="kma-theme-panel shrink-0 space-y-4 border-b border-[var(--kma-brand-border)] bg-[var(--kma-brand)] p-4">
                <div>
                    <h2 className="text-base font-semibold text-[var(--kma-brand-fg)]">Flow Steps</h2>
                    <p className="mt-1 text-xs text-[var(--kma-brand-muted)]">{filteredSteps.length} of {flow.steps.length} total steps</p>
                </div>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kma-muted)]" aria-hidden="true" />
                    <Input value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search steps..." aria-label="Search steps" className="pl-9" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {(["Question", "Form", "Select", "End"] as const).map((type) => (
                        <Button key={type} type="button" variant="secondary" disabled={!isAdmin} onClick={() => onAddStep(type)} className="justify-start px-2.5 text-xs" title={!isAdmin ? "Only administrators can add steps" : `Add ${type} step`}>
                            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{type}
                        </Button>
                    ))}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-left" aria-label="Flow step sequence">
                    <tbody className="divide-y divide-[var(--kma-border)] text-sm">
                        {filteredSteps.length === 0 ? (
                            <tr><td className="px-4 py-10 text-center text-[var(--kma-muted)]">
                                <p className="font-medium text-[var(--kma-fg)]">{searchTerm ? "No matching steps" : "Add your first step"}</p>
                                <p className="mt-1 text-xs">{searchTerm ? "No steps match your search criteria." : "Choose a step type above to start your flow."}</p>
                            </td></tr>
                        ) : filteredSteps.map((step, index) => {
                            const isSelected = selectedStepId === step.id;
                            const incomplete = isStepIncomplete(step);
                            const barriers = getBarrierIds(step);
                            const isDuplicateId = flow.steps.filter((s) => s.id === step.id).length > 1;
                            const title = step.type === "Question" ? step.text : step.type === "Form" ? step.title : step.type === "Select" ? step.title || step.text || "Select Options" : "End of flow";
                            return (
                                <tr key={`${step.id}-${index}`} draggable={searchTerm === "" && isAdmin}
                                    onDragStart={(e) => onDragStart(e, step.id)} onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, step.id)} onDragEnter={(e) => onDragEnter(e, step.id)}
                                    onDragLeave={(e) => onDragLeave(e, step.id)} onDragEnd={onDragEnd}
                                    onClick={() => onSelectStep(step.id)}
                                    className={cn("group transition-colors", isSelected ? "bg-[var(--kma-selected)]" : "hover:bg-[var(--kma-subtle)]", draggedStepId === step.id && "opacity-40", dragOverStepId === step.id && "bg-[var(--kma-selected)] outline outline-1 outline-[var(--kma-primary)]")}
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-start gap-2">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onSelectStep(step.id); }} aria-current={isSelected ? "step" : undefined} className="min-h-11 min-w-0 flex-1 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--kma-primary)]" aria-label={`Select step ${step.id}`}>
                                                <span className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--kma-muted)]"><span>Step {flow.steps.indexOf(step) + 1}</span><span>{step.type}</span></span>
                                                <span className="flex flex-wrap items-center gap-2">
                                                    {searchTerm === "" && isAdmin ? <span title="Drag to reorder" className="cursor-grab text-[var(--kma-muted)]"><GripVertical className="h-4 w-4" aria-hidden="true" /></span> : null}
                                                    <span className="font-bold break-all text-[var(--kma-fg)]">{step.id}</span>
                                                    {isDuplicateId ? <span className="text-xs font-medium text-[var(--kma-danger)]" title="Duplicate ID: Each step must have a unique ID">DUP</span> : null}
                                                    {incomplete ? <span title="Incomplete: missing step references"><AlertTriangle className="h-4 w-4 text-[var(--kma-warning)]" aria-label="Incomplete step" /></span> : null}
                                                </span>
                                                <span className="mt-1.5 block break-words text-sm leading-5 text-[var(--kma-fg)]">{title || "Untitled step"}</span>
                                            </button>
                                            <button type="button" disabled={!isAdmin} onClick={(e) => { e.stopPropagation(); if (isAdmin) onDeleteStep(step.id); }} className="inline-flex h-[var(--kma-control-height)] w-[var(--kma-control-height)] shrink-0 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--kma-danger)_10%,transparent)] hover:text-[var(--kma-danger)] disabled:cursor-not-allowed disabled:opacity-40" title={!isAdmin ? "Only administrators can delete steps" : "Delete step"} aria-label={`Delete step ${step.id}`}>
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </div>
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
};
