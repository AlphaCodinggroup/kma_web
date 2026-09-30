"use client";

import React from "react";
import type { Flow, FlowStep, FormStep, QuestionStep, SelectStep } from "@entities/flow/model";
import { Input, Button } from "@shared/ui/controls";
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
                            "font-mono text-[11px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 whitespace-nowrap",
                            q.yesNext
                                ? "border-emerald-500/60 bg-emerald-50/70 text-emerald-800"
                                : "border-amber-400 bg-amber-50 text-amber-800"
                        )}
                        title={q.yesNext ? `YES leads to ${q.yesNext}` : "Missing YES link"}
                    >
                        YES <ArrowRight className="h-2.5 w-2.5 inline" /> {q.yesNext || "Missing"}
                    </span>
                    <span
                        className={cn(
                            "font-mono text-[11px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 whitespace-nowrap",
                            q.noNext
                                ? "border-red-400/70 bg-red-50/70 text-red-800"
                                : "border-amber-400 bg-amber-50 text-amber-800"
                        )}
                        title={q.noNext ? `NO leads to ${q.noNext}` : "Missing NO link"}
                    >
                        NO <ArrowRight className="h-2.5 w-2.5 inline" /> {q.noNext || "Missing"}
                    </span>
                    {(q.conditionalYesNext || q.conditionalNoNext) && (
                        <span
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300 font-semibold"
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
                            className="font-mono text-[11px] px-2 py-0.5 rounded border border-gray-300 bg-gray-50 text-gray-700 font-medium flex items-center gap-1 whitespace-nowrap"
                            title={`Proceeds to ${f.next}`}
                        >
                            NEXT <ArrowRight className="h-2.5 w-2.5 inline" /> {f.next}
                        </span>
                    ) : (
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-amber-400 bg-amber-50 text-amber-800 font-medium">
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
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-amber-400 bg-amber-50 text-amber-800 font-medium">
                        No options
                    </span>
                );
            }

            return (
                <div className="flex flex-wrap items-center gap-1">
                    {s.options.slice(0, 2).map((opt, idx) => (
                        <span
                            key={idx}
                            className={cn(
                                "font-mono text-[11px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 max-w-[150px] truncate",
                                opt.next
                                    ? "border-purple-300 bg-purple-50/60 text-purple-900"
                                    : "border-amber-400 bg-amber-50 text-amber-800"
                            )}
                            title={`${opt.label} -> ${opt.next || "Missing"}`}
                        >
                            <span className="truncate">{opt.label}</span>
                            <ArrowRight className="h-2.5 w-2.5 inline shrink-0" />
                            <span className="shrink-0">{opt.next || "?"}</span>
                        </span>
                    ))}
                    {s.options.length > 2 && (
                        <span className="text-[10px] text-gray-500 font-mono px-1">
                            +{s.options.length - 2} more
                        </span>
                    )}
                </div>
            );
        }

        if (step.type === "End") {
            return (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-gray-300 bg-gray-100 text-gray-500 font-medium">
                    END
                </span>
            );
        }

        return null;
    };

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Cabecera de la sección Flow Steps */}
            <div className="p-4 border-b border-gray-200 bg-white shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 tracking-tight">Flow Steps</h2>
                        <p className="text-xs text-gray-500">
                            {filteredSteps.length} of {flow.steps.length} total steps
                        </p>
                    </div>

                    {/* Botonera de añadir paso rápido */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => onAddStep("Question")}
                            className="h-7 px-2.5 text-xs bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isAdmin ? "Only administrators can add steps" : "Add Question step"}
                        >
                            <Plus className="h-3 w-3 mr-1 text-blue-600" /> Question
                        </Button>
                        <Button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => onAddStep("Form")}
                            className="h-7 px-2.5 text-xs bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isAdmin ? "Only administrators can add steps" : "Add Form step"}
                        >
                            <Plus className="h-3 w-3 mr-1 text-emerald-600" /> Form
                        </Button>
                        <Button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => onAddStep("Select")}
                            className="h-7 px-2.5 text-xs bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isAdmin ? "Only administrators can add steps" : "Add Select step"}
                        >
                            <Plus className="h-3 w-3 mr-1 text-purple-600" /> Select
                        </Button>
                        <Button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => onAddStep("End")}
                            className="h-7 px-2.5 text-xs bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isAdmin ? "Only administrators can add steps" : "Add End step"}
                        >
                            <Plus className="h-3 w-3 mr-1 text-gray-600" /> End
                        </Button>
                    </div>
                </div>

                {/* Input de Búsqueda */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search steps..."
                        className="pl-9 h-9 text-xs bg-gray-50/50 border-gray-200 focus:bg-white"
                    />
                </div>
            </div>

            {/* Tabla Principal de Pasos */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full border-collapse text-left">
                    <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-200">
                        <tr className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="py-2.5 px-4 w-[110px]">ID</th>
                            <th className="py-2.5 px-3 w-[85px]">Type</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Question / Title</th>
                            <th className="py-2.5 px-3 min-w-[200px]">Routing</th>
                            <th className="py-2.5 px-3 w-[100px]">Barriers</th>
                            <th className="py-2.5 px-2 w-[40px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                        {filteredSteps.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400">
                                    No steps match your search criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredSteps.map((step, index) => {
                                const isSelected = selectedStepId === step.id;
                                const incomplete = isStepIncomplete(step);
                                const isDragged = draggedStepId === step.id;
                                const isDragOver = dragOverStepId === step.id;
                                const barriers = getBarrierIds(step);
                                const isDuplicateId = flow.steps.filter((s) => s.id === step.id).length > 1;

                                return (
                                    <tr
                                        key={`${step.id}-${index}`}
                                        draggable={searchTerm === "" && isAdmin}
                                        onDragStart={(e) => onDragStart(e, step.id)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, step.id)}
                                        onDragEnter={(e) => onDragEnter(e, step.id)}
                                        onDragLeave={(e) => onDragLeave(e, step.id)}
                                        onDragEnd={onDragEnd}
                                        onClick={() => onSelectStep(step.id)}
                                        className={cn(
                                            "group cursor-pointer transition-colors border-l-4",
                                            isSelected
                                                ? "bg-gray-100/90 border-l-blue-600 font-medium text-gray-900"
                                                : "border-l-transparent hover:bg-gray-50/80 text-gray-700",
                                            incomplete && !isSelected && "bg-amber-50/30",
                                            isDuplicateId && !isSelected && "bg-red-50/20",
                                            isDragged && "opacity-40 bg-gray-200 border-dashed",
                                            isDragOver && "border-t-2 border-t-purple-500 bg-purple-50"
                                        )}
                                    >
                                        {/* ID */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 font-mono font-bold text-gray-900 text-xs">
                                                {searchTerm === "" && isAdmin && (
                                                    <span
                                                        className="cursor-grab active:cursor-grabbing text-gray-300 group-hover:text-gray-500 -ml-1"
                                                        title="Drag to reorder"
                                                    >
                                                        <GripVertical className="h-3.5 w-3.5" />
                                                    </span>
                                                )}
                                                <span className="font-bold">{step.id}</span>
                                                {isDuplicateId && (
                                                    <span
                                                        className="text-[10px] text-red-600 bg-red-100 border border-red-300 px-1 py-0.2 rounded font-sans"
                                                        title="Duplicate ID: Each step must have a unique ID"
                                                    >
                                                        DUP
                                                    </span>
                                                )}
                                                {incomplete && (
                                                    <span title="Incomplete: missing step references">
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            <span className="font-mono text-xs text-gray-600">
                                                {step.type}
                                            </span>
                                        </td>

                                        {/* Question / Title */}
                                        <td className="py-3 px-3">
                                            <div className="line-clamp-2 leading-relaxed text-gray-800">
                                                {step.type === "Question" && (step as QuestionStep).text}
                                                {step.type === "Form" && (step as FormStep).title}
                                                {step.type === "Select" &&
                                                    ((step as SelectStep).title || (step as SelectStep).text || "Select Options")}
                                                {step.type === "End" && "End of flow"}
                                            </div>
                                        </td>

                                        {/* Routing */}
                                        <td className="py-3 px-3">
                                            {renderRouting(step)}
                                        </td>

                                        {/* Barriers */}
                                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-gray-700">
                                            {barriers ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {barriers.split(", ").map((b) => (
                                                        <span key={b} className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-700">
                                                            {b}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>

                                        {/* Quick Actions (Delete) */}
                                        <td className="py-3 px-2 text-right">
                                            <button
                                                type="button"
                                                disabled={!isAdmin}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isAdmin) onDeleteStep(step.id);
                                                }}
                                                className={cn(
                                                    "p-1 text-gray-400 rounded transition-all",
                                                    isAdmin
                                                        ? "opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50"
                                                        : "opacity-40 cursor-not-allowed"
                                                )}
                                                title={!isAdmin ? "Only administrators can delete steps" : "Delete step"}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
