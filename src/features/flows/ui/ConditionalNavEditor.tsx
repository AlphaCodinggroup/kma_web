"use client";

import React from "react";
import type { Condition, ConditionalNext, Flow, SelectStep } from "@entities/flow/model";
import { Button, Label } from "@shared/ui/controls";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

export interface ConditionalNavEditorProps {
    label: string;
    description: string;
    conditional: ConditionalNext | undefined;
    onChange: (conditional: ConditionalNext | undefined) => void;
    currentStepId: string;
    flow: Flow;
    disabled?: boolean;
}

export const ConditionalNavEditor: React.FC<ConditionalNavEditorProps> = ({
    label,
    description,
    conditional,
    onChange,
    currentStepId,
    flow,
    disabled = false
}) => {
    const [isExpanded, setIsExpanded] = React.useState(!!conditional);
    const [isEnabled, setIsEnabled] = React.useState(!!conditional);

    // Obtener los pasos que aparecen antes del paso actual (pueden ser referenciados en condiciones)
    const currentStepIndex = flow.steps.findIndex((s) => s.id === currentStepId);
    const availableSteps = flow.steps.slice(0, currentStepIndex);

    // Opciones del select para un paso dado
    const getSelectOptions = (stepId: string): string[] => {
        const step = flow.steps.find((s) => s.id === stepId);
        if (step && step.type === "Select") {
            return (step as SelectStep).options.map((opt) => opt.label);
        }
        return [];
    };

    const handleToggle = (enabled: boolean) => {
        if (disabled) return;
        setIsEnabled(enabled);
        if (enabled) {
            onChange({ conditions: [], next: "", match_any: false });
        } else {
            onChange(undefined);
        }
    };

    const handleAddCondition = () => {
        const newCondition: Condition = { step_id: "" };
        onChange({
            ...conditional,
            conditions: [...(conditional?.conditions || []), newCondition],
            next: conditional?.next || "",
            match_any: conditional?.match_any || false
        });
    };

    const handleUpdateCondition = (index: number, updates: Partial<Condition>) => {
        const newConditions = [...(conditional?.conditions || [])];
        newConditions[index] = { ...newConditions[index], ...updates };
        onChange({
            ...conditional,
            conditions: newConditions,
            next: conditional?.next || "",
            match_any: conditional?.match_any || false
        });
    };

    const handleDeleteCondition = (index: number) => {
        const newConditions = (conditional?.conditions || []).filter((_, i) => i !== index);
        onChange({
            ...conditional,
            conditions: newConditions,
            next: conditional?.next || "",
            match_any: conditional?.match_any || false
        });
    };

    return (
        <div className="space-y-2 border-t pt-3">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-2.5 bg-purple-50 hover:bg-purple-100/70 border border-purple-200 rounded-lg transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isEnabled}
                        disabled={disabled}
                        onChange={(e) => handleToggle(e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">{label}</span>
                    {isEnabled && conditional && (
                        <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full font-medium">
                            {conditional.conditions.length} cond.
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-purple-600" /> : <ChevronDown className="h-4 w-4 text-purple-600" />}
            </button>

            {isExpanded && isEnabled && conditional && (
                <div className="p-3 border border-purple-200 rounded-lg bg-purple-50/20 space-y-3">
                    <p className="text-xs text-gray-500">{description}</p>

                    {/* Paso de destino */}
                    <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1 block">Target Step (when conditions match)</Label>
                        <select
                            value={conditional.next || ""}
                            disabled={disabled}
                            onChange={(e) => onChange({ ...conditional, next: e.target.value })}
                            className="w-full rounded-md bg-white border border-gray-300 text-gray-900 text-xs focus:ring-purple-500 focus:border-purple-500 p-2"
                        >
                            <option value="">Select target step...</option>
                            {flow.steps.map((s, sIdx) => (
                                <option key={`${s.id}-${sIdx}`} value={s.id}>
                                    {s.id} ({s.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Lógica de coincidencia */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`match-any-${label}`}
                            checked={conditional.match_any || false}
                            disabled={disabled}
                            onChange={(e) => onChange({ ...conditional, match_any: e.target.checked })}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor={`match-any-${label}`} className="text-xs text-gray-700 cursor-pointer">
                            Match ANY condition (OR logic) - default is ALL (AND logic)
                        </Label>
                    </div>

                    {/* Lista de condiciones */}
                    <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Conditions</Label>
                        <div className="space-y-2">
                            {conditional.conditions.map((condition, idx) => {
                                const selectedStep = flow.steps.find((s) => s.id === condition.step_id);
                                return (
                                    <div key={idx} className="p-2.5 bg-white border border-gray-200 rounded-md space-y-2 shadow-sm">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 space-y-1.5">
                                                {/* Selección de paso */}
                                                <select
                                                    value={condition.step_id}
                                                    disabled={disabled}
                                                    onChange={(e) => {
                                                        const stepId = e.target.value;
                                                        handleUpdateCondition(idx, { step_id: stepId });
                                                    }}
                                                    className="w-full rounded bg-gray-50 border border-gray-300 text-xs p-1.5"
                                                >
                                                    <option value="">Select step...</option>
                                                    {availableSteps.map((s, sIdx) => (
                                                        <option key={`${s.id}-${sIdx}`} value={s.id}>
                                                            {s.id} ({s.type})
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Respuesta de pregunta */}
                                                {selectedStep?.type === "Question" && (
                                                    <select
                                                        value={condition.answer || ""}
                                                        disabled={disabled}
                                                        onChange={(e) => handleUpdateCondition(idx, { answer: e.target.value as "YES" | "NO" })}
                                                        className="w-full rounded bg-gray-50 border border-gray-300 text-xs p-1.5"
                                                    >
                                                        <option value="">Select answer...</option>
                                                        <option value="YES">YES</option>
                                                        <option value="NO">NO</option>
                                                    </select>
                                                )}

                                                {/* Opción de select */}
                                                {selectedStep?.type === "Select" && (
                                                    <select
                                                        value={condition.selected_option || ""}
                                                        disabled={disabled}
                                                        onChange={(e) => handleUpdateCondition(idx, { selected_option: e.target.value })}
                                                        className="w-full rounded bg-gray-50 border border-gray-300 text-xs p-1.5"
                                                    >
                                                        <option value="">Select option...</option>
                                                        {getSelectOptions(condition.step_id).map((opt, optIdx) => (
                                                            <option key={`${opt}-${optIdx}`} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            {!disabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCondition(idx)}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                                    title="Delete condition"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {!disabled && (
                                <Button
                                    type="button"
                                    onClick={handleAddCondition}
                                    className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Condition
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
