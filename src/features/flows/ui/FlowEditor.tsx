"use client";

import React from "react";
import type { Flow, FormStep, QuestionStep, SelectStep } from "@entities/flow/model";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button, Input, Label, Textarea } from "@shared/ui/controls";
import { ImagePlus, Save, ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";

interface FlowEditorProps {
    initialFlow: Flow;
}

export const FlowEditor: React.FC<FlowEditorProps> = ({ initialFlow }) => {
    const [flow, setFlow] = React.useState<Flow>(initialFlow);
    const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set());

    const handleStepChange = (index: number, field: string, value: string) => {
        const newSteps = [...flow.steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setFlow({ ...flow, steps: newSteps });
    };

    const handleFormFieldChange = (
        stepIndex: number,
        fieldIndex: number,
        fieldKey: string,
        value: string
    ) => {
        const newSteps = [...flow.steps];
        const formStep = newSteps[stepIndex] as FormStep;
        const newFields = [...formStep.fields];
        newFields[fieldIndex] = { ...newFields[fieldIndex], [fieldKey]: value };
        newSteps[stepIndex] = { ...formStep, fields: newFields };
        setFlow({ ...flow, steps: newSteps });
    };

    const handleDeleteFormField = (stepIndex: number, fieldIndex: number) => {
        const newSteps = [...flow.steps];
        const formStep = newSteps[stepIndex] as FormStep;
        const newFields = formStep.fields.filter((_, i) => i !== fieldIndex);
        newSteps[stepIndex] = { ...formStep, fields: newFields };
        setFlow({ ...flow, steps: newSteps });
    };

    const handleSelectOptionChange = (
        stepIndex: number,
        optionIndex: number,
        field: string,
        value: string
    ) => {
        const newSteps = [...flow.steps];
        const selectStep = newSteps[stepIndex] as SelectStep;
        const newOptions = [...selectStep.options];
        newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
        newSteps[stepIndex] = { ...selectStep, options: newOptions };
        setFlow({ ...flow, steps: newSteps });
    };

    const toggleStepExpanded = (stepId: string) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(stepId)) {
            newExpanded.delete(stepId);
        } else {
            newExpanded.add(stepId);
        }
        setExpandedSteps(newExpanded);
    };

    const handleAttachImage = (stepId: string) => {
        console.log(`Attaching image to step ${stepId}`);
        alert(`Image attachment triggered for step ${stepId}`);
    };

    const renderStepContent = (step: Flow["steps"][0], index: number) => {
        if (step.type === "Question") {
            const qStep = step as QuestionStep;

            const noNextForm = qStep.noNext
                ? flow.steps.find(s => s.id === qStep.noNext && s.type === "Form") as FormStep | undefined
                : undefined;

            const isFormExpanded = noNextForm ? expandedSteps.has(noNextForm.id) : false;

            return (
                <div className="space-y-4">
                    <div className="grid w-full gap-1.5">
                        <Label>Question Text</Label>
                        <Textarea
                            value={qStep.text}
                            onChange={(e) => handleStepChange(index, "text", e.target.value)}
                            rows={2}
                        />
                    </div>

                    {noNextForm && (
                        <div className="border-t pt-4">
                            <button
                                onClick={() => toggleStepExpanded(noNextForm.id)}
                                className="flex w-full items-center justify-between rounded-lg bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 border border-orange-200"
                            >
                                <span>Form on "No": {noNextForm.fields.length} fields</span>
                                {isFormExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </button>

                            {isFormExpanded && (
                                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="grid grid-cols-[1fr_2fr_2fr_100px_40px] gap-3 mb-3 pb-2 border-b border-gray-300">
                                        <Label className="text-xs font-semibold text-gray-700">Type</Label>
                                        <Label className="text-xs font-semibold text-gray-700">Label</Label>
                                        <Label className="text-xs font-semibold text-gray-700">Placeholder</Label>
                                        <Label className="text-xs font-semibold text-gray-700">Unit</Label>
                                        <div></div>
                                    </div>

                                    <div className="space-y-2">
                                        {noNextForm.fields.map((field, fieldIdx) => {
                                            const formIndex = flow.steps.findIndex(s => s.id === noNextForm.id);
                                            const isTextType = field.type === "text";
                                            const isMeasurements = field.id === "measurements";

                                            return (
                                                <div
                                                    key={fieldIdx}
                                                    className="grid grid-cols-[1fr_2fr_2fr_100px_40px] gap-3 items-center"
                                                >
                                                    <Input
                                                        value={field.type}
                                                        disabled
                                                        className="bg-gray-50 text-sm"
                                                    />
                                                    <Input
                                                        value={field.label}
                                                        onChange={(e) =>
                                                            handleFormFieldChange(formIndex, fieldIdx, "label", e.target.value)
                                                        }
                                                        className="text-sm"
                                                    />
                                                    <Input
                                                        value={(field as any).placeholder ?? ""}
                                                        onChange={(e) =>
                                                            handleFormFieldChange(formIndex, fieldIdx, "placeholder", e.target.value)
                                                        }
                                                        className="text-sm"
                                                        placeholder={isTextType || isMeasurements ? "Enter placeholder..." : ""}
                                                        disabled={!isTextType}
                                                    />

                                                    {isMeasurements ? (
                                                        <select
                                                            value={(field as any).unit ?? '"'}
                                                            onChange={(e) =>
                                                                handleFormFieldChange(formIndex, fieldIdx, "unit", e.target.value)
                                                            }
                                                            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                                                        >
                                                            <option value='"'>in (")</option>
                                                            <option value="cm">cm</option>
                                                            <option value="m">m</option>
                                                            <option value="ft">ft</option>
                                                            <option value="%">%</option>
                                                            <option value="°">° (degrees)</option>
                                                        </select>
                                                    ) : (
                                                        <Input
                                                            value={(field as any).unit ?? ""}
                                                            disabled
                                                            className="bg-gray-50 text-sm"
                                                        />
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteFormField(formIndex, fieldIdx)}
                                                        className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50"
                                                        title="Delete field"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {noNextForm.fields.length < 4 && (
                                        <button
                                            onClick={() => {
                                                const formIndex = flow.steps.findIndex(s => s.id === noNextForm.id);
                                                const existingIds = noNextForm.fields.map(f => f.id);
                                                const availableFieldIds = (["quantity", "measurements", "photo", "notes"] as const).filter(
                                                    (fieldId) => !existingIds.includes(fieldId)
                                                );

                                                if (availableFieldIds.length === 0) {
                                                    alert("All fields are already added");
                                                    return;
                                                }

                                                const fieldId = availableFieldIds[0];
                                                const fieldConfig: Record<string, { type: string; label: string; unit?: string; placeholder?: string }> = {
                                                    quantity: { type: "number", label: "Quantity" },
                                                    measurements: { type: "number", label: "Measurements", unit: "\"" },
                                                    photo: { type: "photo", label: "Upload photo" },
                                                    notes: { type: "text", label: "Notes (optional)", placeholder: "Enter notes..." }
                                                };

                                                const config = fieldConfig[fieldId];
                                                const newField: any = {
                                                    id: fieldId,
                                                    type: config.type,
                                                    label: config.label
                                                };

                                                if (config.unit) {
                                                    newField.unit = config.unit;
                                                }

                                                if (config.placeholder) {
                                                    newField.placeholder = config.placeholder;
                                                }

                                                const newSteps = [...flow.steps];
                                                const formStep = newSteps[formIndex] as FormStep;
                                                newSteps[formIndex] = {
                                                    ...formStep,
                                                    fields: [...formStep.fields, newField]
                                                };
                                                setFlow({ ...flow, steps: newSteps });
                                            }}
                                            className="mt-3 w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-400 flex items-center justify-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Field ({noNextForm.fields.length}/4)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (step.type === "Select") {
            const sStep = step as SelectStep;
            return (
                <div className="space-y-4">
                    <div className="grid w-full gap-1.5">
                        <Label>{sStep.title ? "Title" : "Text"}</Label>
                        <Textarea
                            value={sStep.title ?? sStep.text ?? ""}
                            onChange={(e) =>
                                handleStepChange(index, sStep.title ? "title" : "text", e.target.value)
                            }
                            rows={1}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Options</Label>
                        {sStep.options.map((option, optIdx) => (
                            <div key={optIdx} className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Label"
                                    value={option.label}
                                    onChange={(e) =>
                                        handleSelectOptionChange(index, optIdx, "label", e.target.value)
                                    }
                                />
                                <Input
                                    placeholder="Next Step"
                                    value={option.next}
                                    onChange={(e) =>
                                        handleSelectOptionChange(index, optIdx, "next", e.target.value)
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    const visibleSteps = flow.steps.filter(
        (step) => step.type === "Question" || step.type === "Select"
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Flow Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={flow.title}
                            onChange={(e) => setFlow({ ...flow, title: e.target.value })}
                        />
                    </div>
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={flow.description ?? ""}
                            onChange={(e) => setFlow({ ...flow, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Steps</h3>
                {visibleSteps.map((step) => {
                    const index = flow.steps.findIndex((s) => s.id === step.id);
                    return (
                        <Card key={step.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-500 uppercase">
                                                {step.type}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAttachImage(step.id)}
                                        title="Attach Image"
                                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 hover:bg-gray-100 transition-colors"
                                    >
                                        <ImagePlus className="h-4 w-4 text-gray-700" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent>{renderStepContent(step, index)}</CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
};
