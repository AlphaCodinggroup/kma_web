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
import { Input, Label, Textarea, Button } from "@shared/ui/controls";
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
    if (!selectedStep) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
                <CornerDownRight className="h-8 w-8 mb-2 opacity-30 text-gray-400" />
                <p className="text-sm font-medium text-gray-600">No step selected</p>
                <p className="text-xs text-gray-400 mt-1">Select a step from the sidebar to edit</p>
            </div>
        );
    }

    const images = selectedStep.images || [];

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header del Inspector */}
            <div className="p-4 border-b border-gray-200 bg-white shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold font-mono text-gray-900 tracking-tight">
                                {selectedStep.id}
                            </h2>
                            <span className="text-[10px] font-mono uppercase bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded font-semibold">
                                {selectedStep.type}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            <span>{selectedStep.type}</span> · <span>Editing step details</span>
                        </p>
                    </div>

                    {/* Imágenes de referencia y acciones rápidas */}
                    <div className="flex items-center gap-2">
                        {images.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                                {images.map((imgUrl, i) => (
                                    <div key={i} className="relative group shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imgUrl}
                                            alt={`Ref ${i}`}
                                            onClick={() => onZoomImage(imgUrl)}
                                            className="h-8 w-8 object-cover rounded border border-gray-200 shadow-sm cursor-zoom-in hover:ring-2 hover:ring-blue-400 transition-all"
                                        />
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => onRemoveImage(selectedStep.id, i)}
                                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove photo"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={onImageClick}
                                        title="Add another photo"
                                        className="h-8 w-8 rounded border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            isAdmin && (
                                <Button
                                    type="button"
                                    onClick={onImageClick}
                                    className="h-7 px-2 text-xs bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm gap-1"
                                    title="Add reference image"
                                >
                                    <ImagePlus className="h-3 w-3" /> Add Image
                                </Button>
                            )
                        )}

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => onDeleteStep(selectedStep.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete current step"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Contenido scrolleable del formulario */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* STEP ID EDITABLE */}
                <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Step ID
                    </Label>
                    <Input
                        value={selectedStep.id}
                        disabled={!isAdmin}
                        onChange={(e) => onUpdateStep(selectedStep.id, { id: e.target.value })}
                        className="font-mono text-xs h-8 bg-gray-50/50"
                    />
                </div>

                {/* FORM STEP VIEW */}
                {selectedStep.type === "Form" && (
                    <>
                        {/* TITLE */}
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                Title
                            </Label>
                            <Input
                                value={(selectedStep as FormStep).title}
                                disabled={!isAdmin}
                                onChange={(e) => onUpdateStep(selectedStep.id, { title: e.target.value })}
                                placeholder="Form step title..."
                                className="text-xs font-medium"
                            />
                        </div>

                        {/* NEXT STEP */}
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                Next Step
                            </Label>
                            <StepSelector
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
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
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
                                            className="flex items-center justify-center px-3 h-8 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Quantity
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAddField(selectedStep.id, "measurements")}
                                            className="flex items-center justify-center px-3 h-8 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-md shadow-sm transition-colors"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Measurement
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAddField(selectedStep.id, "photo")}
                                            disabled={(selectedStep as FormStep).fields.some((f) => f.id === "photo")}
                                            className="flex items-center justify-center px-3 h-8 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Photo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAddField(selectedStep.id, "notes")}
                                            disabled={(selectedStep as FormStep).fields.some((f) => f.id === "notes")}
                                            className="flex items-center justify-center px-3 h-8 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Notes
                                        </button>
                                    </div>
                                )}

                                {/* Form Fields List */}
                                <div className="space-y-2">
                                    {(selectedStep as FormStep).fields.map((field, fIdx) => (
                                        <div key={fIdx} className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 text-xs font-mono text-gray-500 shrink-0">{field.type}</div>
                                                <Input
                                                    className="h-8 text-sm flex-1 bg-white"
                                                    value={field.label}
                                                    disabled={!isAdmin}
                                                    onChange={(e) => onUpdateField(selectedStep.id, fIdx, { label: e.target.value })}
                                                />
                                                {field.id.startsWith("measurements") && (
                                                    <select
                                                        value={field.unit ?? '"'}
                                                        disabled={!isAdmin}
                                                        onChange={(e) => onUpdateField(selectedStep.id, fIdx, { unit: e.target.value })}
                                                        className="h-8 text-sm border border-gray-300 rounded-md px-2 bg-white shrink-0"
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
                                                        className="text-gray-400 hover:text-red-500 p-1 shrink-0"
                                                        title="Delete field"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            {(field.type === "text" || field.type === "number") && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 text-xs text-gray-400 shrink-0 text-right pr-2">Placeholder</div>
                                                    <Input
                                                        className="h-8 text-xs flex-1 bg-white"
                                                        placeholder="Optional placeholder..."
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
                        <div className="pt-2 border-t space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                Shared Quantity
                            </Label>
                            <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-xs text-purple-900 leading-relaxed">
                                <Info className="h-3.5 w-3.5 inline mr-1 text-purple-600" />
                                Barrier IDs will be calculated and saved automatically when you click &quot;Save Flow&quot;.
                                <br />
                                <span>
                                    Current detected barriers (saved):{" "}
                                    <strong className="font-mono">
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
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                Question Text
                            </Label>
                            <Textarea
                                value={(selectedStep as QuestionStep).text}
                                disabled={!isAdmin}
                                onChange={(e) => onUpdateStep(selectedStep.id, { text: e.target.value })}
                                placeholder="Enter question text"
                                rows={3}
                                className="text-xs"
                            />
                        </div>

                        {/* ROUTING: YES & NO */}
                        <div className="space-y-3 pt-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                ROUTING
                            </Label>

                            {/* YES Next */}
                            <div className="space-y-1">
                                <Label className="flex items-center gap-1 text-xs font-semibold text-emerald-800 cursor-pointer">
                                    Yes <ArrowRight className="h-3 w-3 inline" />
                                </Label>
                                <StepSelector
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
                                <Label className="flex items-center gap-1 text-xs font-semibold text-red-800 cursor-pointer">
                                    No <ArrowRight className="h-3 w-3 inline" />
                                </Label>
                                <StepSelector
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
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                Barrier ID
                            </Label>
                            <Input
                                value={(selectedStep as QuestionStep).barrierId || ""}
                                disabled={!isAdmin}
                                onChange={(e) =>
                                    onUpdateStep(selectedStep.id, { ...selectedStep, barrierId: e.target.value } as QuestionStep)
                                }
                                placeholder="e.g. AR-B01"
                                className="font-mono text-xs h-8"
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
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                Title / Text
                            </Label>
                            <Textarea
                                value={(selectedStep as SelectStep).title || (selectedStep as SelectStep).text || ""}
                                disabled={!isAdmin}
                                onChange={(e) =>
                                    onUpdateStep(selectedStep.id, { title: e.target.value, text: e.target.value })
                                }
                                placeholder="Select prompt title..."
                                rows={2}
                                className="text-xs"
                            />
                        </div>

                        {/* OPTIONS LIST */}
                        <div className="space-y-3 pt-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                Options
                            </Label>

                            <div className="space-y-3">
                                {(selectedStep as SelectStep).options.map((option, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2 relative"
                                    >
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 block mb-0.5">LABEL</span>
                                            <Input
                                                value={option.label}
                                                disabled={!isAdmin}
                                                onChange={(e) =>
                                                    onUpdateOption(selectedStep.id, idx, "label", e.target.value)
                                                }
                                                className="h-8 text-xs bg-white"
                                            />
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 block mb-0.5">NEXT</span>
                                            <StepSelector
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
                                            <span className="text-[10px] font-bold text-gray-400 block mb-0.5">BARRIER</span>
                                            <Input
                                                value={option.barrierId || ""}
                                                disabled={!isAdmin}
                                                onChange={(e) =>
                                                    onUpdateOption(selectedStep.id, idx, "barrierId", e.target.value)
                                                }
                                                placeholder="Optional Barrier ID"
                                                className="h-8 text-xs font-mono bg-white"
                                            />
                                        </div>

                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteOption(selectedStep.id, idx)}
                                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                                                title="Delete option"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {isAdmin && (
                                    <Button
                                        type="button"
                                        onClick={() => onAddOption(selectedStep.id)}
                                        className="w-full h-8 px-3 gap-2 bg-black text-white hover:bg-gray-800 shadow-sm border-none text-xs"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add Option
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* END STEP VIEW */}
                {selectedStep.type === "End" && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-2">
                        <p className="font-semibold text-gray-800">End Step</p>
                        <p>This step terminates and completes the flow process when reached by an auditor.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
