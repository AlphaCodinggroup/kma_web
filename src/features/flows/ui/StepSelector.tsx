"use client";

import React from "react";
import type { Flow, FlowStep, FormStep, QuestionStep, SelectStep } from "@entities/flow/model";
import { Plus, HelpCircle, FileText, List, CheckCircle2 } from "lucide-react";

const STEP_TYPES = ["Question", "Form", "Select", "End"] as const;

export interface StepSelectorProps {
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
    const [showCreateMenu, setShowCreateMenu] = React.useState(false);
    const createButtonRef = React.useRef<HTMLDivElement>(null);

    // Cierra el menú al hacer click afuera
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (createButtonRef.current && !createButtonRef.current.contains(event.target as Node)) {
                setShowCreateMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreateAndLink = (type: FlowStep["type"]) => {
        if (stepId && field && onAddStep) {
            onAddStep(type, { stepId, field });
        }
        setShowCreateMenu(false);
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
        <div className={`flex items-center gap-2 ${className || ""}`}>
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="flex-1 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="relative" ref={createButtonRef}>
                    <button
                        type="button"
                        onClick={() => setShowCreateMenu(!showCreateMenu)}
                        className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap shadow-sm"
                        title="Create new step and link here"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Create
                    </button>

                    {showCreateMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
                            {STEP_TYPES.map((type) => (
                                <button
                                    type="button"
                                    key={type}
                                    onClick={() => handleCreateAndLink(type)}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                                >
                                    {type === "Question" && <HelpCircle className="h-3.5 w-3.5 text-blue-500" />}
                                    {type === "Form" && <FileText className="h-3.5 w-3.5 text-green-500" />}
                                    {type === "Select" && <List className="h-3.5 w-3.5 text-purple-500" />}
                                    {type === "End" && <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />}
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
