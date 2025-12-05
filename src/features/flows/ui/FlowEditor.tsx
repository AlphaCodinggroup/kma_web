"use client";

import React from "react";
import type { Flow, FormStep, QuestionStep, SelectStep } from "@entities/flow/model";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button, Input, Label, Textarea } from "@shared/ui/controls";
import { ImagePlus, Save, ChevronDown, ChevronRight, Trash2, Plus, Loader2 } from "lucide-react";
import { flowsRepo } from "@features/flows/api/flows.repo.impl";

interface FlowEditorProps {
    initialFlow: Flow;
}

export const FlowEditor: React.FC<FlowEditorProps> = ({ initialFlow }) => {
    const [flow, setFlow] = React.useState<Flow>(initialFlow);
    const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set());
    const [attachingStepId, setAttachingStepId] = React.useState<string | null>(null);
    const [pendingUploads, setPendingUploads] = React.useState<Record<string, File>>({});
    const [isSaving, setIsSaving] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        setAttachingStepId(stepId);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !attachingStepId) return;

        const newSteps = [...flow.steps];
        const stepIndex = newSteps.findIndex(s => s.id === attachingStepId);
        if (stepIndex === -1) return;

        // Create a preview URL for immediate feedback
        const previewUrl = URL.createObjectURL(file);

        // Store the file for later upload
        setPendingUploads(prev => ({ ...prev, [attachingStepId]: file }));

        newSteps[stepIndex] = { ...newSteps[stepIndex], image: previewUrl };
        setFlow({ ...flow, steps: newSteps });
        setAttachingStepId(null);
    };

    const handleRemoveImage = (stepId: string) => {
        const newSteps = [...flow.steps];
        const stepIndex = newSteps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;

        const step = newSteps[stepIndex];

        // If it was a pending upload, remove it from pending and revoke URL
        if (pendingUploads[stepId]) {
            URL.revokeObjectURL(step.image!);
            const newPending = { ...pendingUploads };
            delete newPending[stepId];
            setPendingUploads(newPending);
        }

        const stepCopy = { ...step };
        delete stepCopy.image;
        newSteps[stepIndex] = stepCopy;
        setFlow({ ...flow, steps: newSteps });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const stepsCopy = [...flow.steps];

            // 1. Upload all pending images in parallel
            const uploadPromises = Object.entries(pendingUploads).map(async ([stepId, file]) => {
                try {
                    // Get presigned URL
                    const { uploadUrl, publicUrl } = await flowsRepo.getPresignedUrl(file.name, file.type);

                    // Upload to S3
                    await flowsRepo.uploadFile(uploadUrl, file);

                    // Update step with public URL
                    const stepIndex = stepsCopy.findIndex(s => s.id === stepId);
                    if (stepIndex !== -1) {
                        stepsCopy[stepIndex] = { ...stepsCopy[stepIndex], image: publicUrl };
                    }

                    return stepId;
                } catch (error) {
                    console.error(`Failed to upload image for step ${stepId}`, error);
                    throw error;
                }
            });

            await Promise.all(uploadPromises);

            const updatedFlow = { ...flow, steps: stepsCopy };
            await flowsRepo.update(flow.id, updatedFlow);

            setFlow(updatedFlow);
            setPendingUploads({});

            Object.values(pendingUploads).forEach(file => {
                // We can't easily revoke the specific URL here without tracking it better, 
                // but browsers handle this eventually. 
                // Ideally we'd map stepId -> previewUrl to revoke.
            });

            alert("Flow saved successfully!");
        } catch (error) {
            console.error("Failed to save flow", error);
            alert("Failed to save flow. Please try again.");
        } finally {
            setIsSaving(false);
        }
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
                                                        value={field.placeholder ?? ""}
                                                        onChange={(e) =>
                                                            handleFormFieldChange(formIndex, fieldIdx, "placeholder", e.target.value)
                                                        }
                                                        className="text-sm"
                                                        placeholder={isTextType || isMeasurements ? "Enter placeholder..." : ""}
                                                        disabled={!isTextType && !isMeasurements}
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
                                    {step.image ? (
                                        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                                            <a
                                                href={step.image}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-700 max-w-[150px] truncate hover:underline"
                                                title={step.image}
                                            >
                                                {step.image.split('/').pop()}
                                            </a>
                                            <button
                                                onClick={() => handleRemoveImage(step.id)}
                                                className="text-blue-400 hover:text-blue-600"
                                                title="Remove image"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleAttachImage(step.id)}
                                            title="Attach Image"
                                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 hover:bg-gray-100 transition-colors"
                                        >
                                            <ImagePlus className="h-4 w-4 text-gray-700" />
                                        </button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>{renderStepContent(step, index)}</CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};
