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
    const panelId = React.useId();
    const [isExpanded, setIsExpanded] = React.useState(!!conditional);
    const [isEnabled, setIsEnabled] = React.useState(!!conditional);

    // Sincroniza la expansión al cambiar de paso o al actualizar el flow
    React.useEffect(() => {
        setIsEnabled(!!conditional);
        setIsExpanded(!!conditional);
    }, [currentStepId, flow, conditional]);

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
            setIsExpanded(true);
            onChange({ conditions: [], next: "", match_any: false });
        } else {
            setIsExpanded(false);
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
        <div className="space-y-2 border-t border-[var(--kma-border)] pt-5">
            <Label className="sr-only">
                {label}
            </Label>
            <div className="space-y-2">
                <div className="flex items-center gap-3 rounded border border-[var(--kma-border)] px-3">
                    <input type="checkbox" checked={isEnabled} disabled={disabled} onChange={(e) => handleToggle(e.target.checked)} aria-label={`Enable ${label}`} className="h-5 w-5 shrink-0 rounded border-[var(--kma-border)] accent-[var(--kma-primary)]" />
                    <button type="button" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded && isEnabled} aria-controls={panelId} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 py-3 text-left text-[var(--kma-fg)]">
                        <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{label}</span>{isEnabled && conditional ? <span className="text-xs text-[var(--kma-muted)]">{conditional.conditions.length} condition(s)</span> : null}</span>
                        {isExpanded && isEnabled ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    </button>
                </div>

                {isExpanded && isEnabled && conditional && (
                    <div id={panelId} className="border-t border-[var(--kma-border)] p-4 space-y-4">
                    <p className="text-xs text-[var(--kma-muted)]">{description}</p>

                    {/* Paso de destino */}
                    <div>
                        <Label className="text-xs font-semibold text-[var(--kma-muted)] mb-1 block">Target Step (when conditions match)</Label>
                        <select
                            aria-label="Target Step (when conditions match)"
                            value={conditional.next || ""}
                            disabled={disabled}
                            onChange={(e) => onChange({ ...conditional, next: e.target.value })}
                            className="min-h-11 w-full min-w-0 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] p-2 text-base text-[var(--kma-fg)] focus:ring-[var(--kma-primary)] sm:min-h-10 sm:text-sm"
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
                            className="rounded border-[var(--kma-border)] text-[var(--kma-primary)] focus:ring-[var(--kma-primary)]"
                        />
                        <Label htmlFor={`match-any-${label}`} className="text-xs text-[var(--kma-muted)] cursor-pointer">
                            Match ANY condition (OR logic) - default is ALL (AND logic)
                        </Label>
                    </div>

                    {/* Lista de condiciones */}
                    <div>
                        <Label className="text-xs font-semibold text-[var(--kma-muted)] mb-1.5 block">Conditions</Label>
                        <div className="space-y-2">
                            {conditional.conditions.map((condition, idx) => {
                                const selectedStep = flow.steps.find((s) => s.id === condition.step_id);
                                return (
                                    <div key={idx} data-condition-row className="border-t border-[var(--kma-border)] pt-3 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="min-w-0 flex-1 space-y-2">
                                                {/* Selección de paso */}
                                                <select
                                                    aria-label={`Condition ${idx + 1} source step`}
                                                    value={condition.step_id}
                                                    disabled={disabled}
                                                    onChange={(e) => {
                                                        const stepId = e.target.value;
                                                        handleUpdateCondition(idx, { step_id: stepId });
                                                    }}
                                                    className="min-h-11 w-full min-w-0 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] p-2 text-base text-[var(--kma-fg)] sm:min-h-10 sm:text-sm"
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
                                                        aria-label={`Condition ${idx + 1} answer`}
                                                        value={condition.answer || ""}
                                                        disabled={disabled}
                                                        onChange={(e) => handleUpdateCondition(idx, { answer: e.target.value as "YES" | "NO" })}
                                                        className="min-h-11 w-full min-w-0 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] p-2 text-base text-[var(--kma-fg)] sm:min-h-10 sm:text-sm"
                                                    >
                                                        <option value="">Select answer...</option>
                                                        <option value="YES">YES</option>
                                                        <option value="NO">NO</option>
                                                    </select>
                                                )}

                                                {/* Opción de select */}
                                                {selectedStep?.type === "Select" && (
                                                    <select
                                                        aria-label={`Condition ${idx + 1} selected option`}
                                                        value={condition.selected_option || ""}
                                                        disabled={disabled}
                                                        onChange={(e) => handleUpdateCondition(idx, { selected_option: e.target.value })}
                                                        className="min-h-11 w-full min-w-0 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] p-2 text-base text-[var(--kma-fg)] sm:min-h-10 sm:text-sm"
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
                                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-subtle)] hover:text-[var(--kma-danger)]"
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
                                    variant="secondary"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Condition
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};
