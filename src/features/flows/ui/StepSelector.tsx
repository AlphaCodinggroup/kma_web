"use client";

import React from "react";
import type { Flow, FlowStep, FormStep, QuestionStep, SelectStep } from "@entities/flow/model";
import { Plus, HelpCircle, FileText, List, CheckCircle2 } from "lucide-react";
import { Button } from "@shared/ui/controls";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@shared/ui/dropdown-menu";

const STEP_TYPES = ["Question", "Form", "Select", "End"] as const;

export interface StepSelectorProps {
    id?: string;
    ariaLabel?: string;
    value?: string | null | undefined;
    onChange: (val: string) => void;
    placeholder?: string;
    stepId?: string;
    field?: string;
    flow: Flow;
    selectedStep?: FlowStep;
    onAddStep?: (type: FlowStep["type"], autoLinkTo?: { stepId: string; field: string }) => void;
    disabled?: boolean;
    className?: string;
}

export const StepSelector: React.FC<StepSelectorProps> = ({
    value,
    id,
    ariaLabel,
    onChange,
    placeholder = "Select next step...",
    stepId,
    field,
    flow,
    selectedStep,
    onAddStep,
    disabled = false,
    className
}) => {
    const handleCreateAndLink = (type: FlowStep["type"]) => {
        if (stepId && field && onAddStep) onAddStep(type, { stepId, field });
    };

    // Regla: Form step solo puede ser usado por UN step padre. Auto-referencia no permitida.
    const isOptionDisabled = (step: FlowStep) => {
        if (selectedStep && step.id === selectedStep.id) return true;

        if (step.type === "Form") {
            const isUsedByOther = flow.steps.some((parent) => {
                if (!selectedStep || parent.id === selectedStep.id) return false;

                if (parent.type === "Question") {
                    if ((parent as QuestionStep).yesNext === step.id) return true;
                    if ((parent as QuestionStep).noNext === step.id) return true;
                }
                if (parent.type === "Select") {
                    if ((parent as SelectStep).options.some((o) => o.next === step.id)) return true;
                }
                if (parent.type === "Form") {
                    if ((parent as FormStep).next === step.id) return true;
                }
                return false;
            });

            if (isUsedByOther) return true;
        }

        return false;
    };

    return (
        <div className={`flex min-w-0 items-center gap-2 ${className || ""}`}>
            <select
                id={id}
                aria-label={ariaLabel}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="min-h-11 min-w-0 flex-1 rounded bg-[var(--kma-surface)] border border-[var(--kma-border)] text-[var(--kma-fg)] text-base sm:min-h-10 sm:text-sm focus:ring-[var(--kma-primary)] focus:border-[var(--kma-primary)] block p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option value="">{placeholder}</option>
                {flow.steps.map((s, idx) => {
                    const optionDisabled = isOptionDisabled(s);
                    if (optionDisabled) return null;

                    return (
                        <option key={`${s.id}-${idx}`} value={s.id}>
                            {s.id} ({s.type})
                        </option>
                    );
                })}
            </select>

            {/* Botón de creación en línea y enlazado */}
            {stepId && field && onAddStep && !disabled && (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" variant="secondary" fullWidth={false} className="px-2.5" title="Create new step and link here">
                            <Plus className="h-4 w-4" aria-hidden="true" />Create
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {STEP_TYPES.map((type) => (
                            <DropdownMenuItem key={type} onSelect={() => handleCreateAndLink(type)}>
                                {type === "Question" ? <HelpCircle className="h-4 w-4" aria-hidden="true" /> : type === "Form" ? <FileText className="h-4 w-4" aria-hidden="true" /> : type === "Select" ? <List className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                                {type}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
};
