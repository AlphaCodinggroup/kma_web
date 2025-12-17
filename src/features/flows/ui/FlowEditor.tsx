"use client";

import React from "react";
import type { Flow, FormStep, QuestionStep, SelectStep, FlowStep, FormField, EndStep } from "@entities/flow/model";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button, Input, Label, Textarea } from "@shared/ui/controls";
import { ImagePlus, Save, Trash2, Plus, Loader2, Search, ArrowRight, CornerDownRight, FileText, HelpCircle, List, AlertCircle, X } from "lucide-react";
import { flowsRepo } from "@features/flows/api/flows.repo.impl";
import { cn } from "@shared/lib/cn";
import { useRouter } from "next/navigation";
import { Loading } from "@shared/ui/Loading";

interface FlowEditorProps {
    initialFlow: Flow;
    mode?: "create" | "edit";
}

const STEP_TYPES = ["Question", "Form", "Select", "End"] as const;

export const FlowEditor: React.FC<FlowEditorProps> = ({ initialFlow }) => {
    const [flow, setFlow] = React.useState<Flow>(initialFlow);
    const [selectedStepId, setSelectedStepId] = React.useState<string | null>(flow.steps[0]?.id || null);
    const [pendingUploads, setPendingUploads] = React.useState<Record<string, File>>({});
    const [isSaving, setIsSaving] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const router = useRouter();

    const selectedStep = flow.steps.find(s => s.id === selectedStepId);

    if (isSaving) {
        return <Loading text="Saving..." />;
    }

    // -- Step Management --

    const handleAddStep = (type: FlowStep["type"]) => {
        const prefix = flow.steps.length > 0 ? flow.steps[0].id.split("-")[0] : "NEW";
        const count = flow.steps.filter(s => s.type === type).length + 1;
        const typeCode = type === "Question" ? "Q" : type === "Form" ? "F" : type === "Select" ? "S" : "E";

        // Find a unique ID
        let newId = `${prefix}-${typeCode}${count.toString().padStart(2, "0")}`;
        let i = 1;
        while (flow.steps.some(s => s.id === newId)) {
            newId = `${prefix}-${typeCode}${(count + i).toString().padStart(2, "0")}`;
            i++;
        }

        let newStep: FlowStep;

        const baseProps = { id: newId, image: null };

        switch (type) {
            case "Question":
                newStep = { ...baseProps, type: "Question", text: "" };
                break;
            case "Form":
                newStep = { ...baseProps, type: "Form", title: "", fields: [] };
                break;
            case "Select":
                newStep = { ...baseProps, type: "Select", text: "", options: [] };
                break;
            case "End":
                newStep = { ...baseProps, type: "End" };
                break;
            default:
                return;
        }

        const newSteps: FlowStep[] = [...flow.steps, newStep];
        setFlow({ ...flow, steps: newSteps });
        setSelectedStepId(newId);
    };

    const handleDeleteStep = (stepId: string) => {
        if (confirm("Are you sure you want to delete this step? References to it will strictly safely be kept but broken.")) {
            const newSteps = flow.steps.filter(s => s.id !== stepId);
            setFlow({ ...flow, steps: newSteps });
            if (selectedStepId === stepId) {
                setSelectedStepId(newSteps[0]?.id || null);
            }
        }
    };

    const handleUpdateStep = (stepId: string, updates: Partial<FlowStep>) => {
        const newSteps = flow.steps.map(s => s.id === stepId ? { ...s, ...updates } as FlowStep : s);
        setFlow({ ...flow, steps: newSteps });

        // If we are renaming the currently selected step, keep it selected
        if (updates.id && stepId === selectedStepId) {
            setSelectedStepId(updates.id);
        }
    };

    // -- Field Management (for Forms) --

    const handleAddField = (stepId: string) => {
        const step = flow.steps.find(s => s.id === stepId) as FormStep;
        if (!step) return;

        const availableFieldIds = (["quantity", "measurements", "photo", "notes"] as const).filter(
            (fieldId) => !step.fields.some(f => f.id === fieldId)
        );

        if (availableFieldIds.length === 0) {
            alert("All standard fields are already added");
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

        if (config.unit) newField.unit = config.unit;
        if (config.placeholder) newField.placeholder = config.placeholder;

        handleUpdateStep(stepId, {
            fields: [...step.fields, newField]
        } as Partial<FormStep>);
    };

    const handleUpdateField = (stepId: string, fieldIndex: number, updates: Partial<FormField>) => {
        const step = flow.steps.find(s => s.id === stepId) as FormStep;
        if (!step) return;
        const newFields = [...step.fields];
        newFields[fieldIndex] = { ...newFields[fieldIndex], ...updates };
        handleUpdateStep(stepId, { fields: newFields } as Partial<FormStep>);
    };

    const handleDeleteField = (stepId: string, fieldIndex: number) => {
        const step = flow.steps.find(s => s.id === stepId) as FormStep;
        if (!step) return;
        const newFields = step.fields.filter((_, i) => i !== fieldIndex);
        handleUpdateStep(stepId, { fields: newFields } as Partial<FormStep>);
    };

    // -- Select Option Management --

    const handleAddOption = (stepId: string) => {
        const step = flow.steps.find(s => s.id === stepId) as SelectStep;
        if (!step) return;
        handleUpdateStep(stepId, {
            options: [...step.options, { label: "New Option", next: "" }]
        } as Partial<SelectStep>);
    };

    const handleUpdateOption = (stepId: string, optionIndex: number, field: string, value: string) => {
        const step = flow.steps.find(s => s.id === stepId) as SelectStep;
        if (!step) return;
        const newOptions = [...step.options];
        newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
        handleUpdateStep(stepId, { options: newOptions } as Partial<SelectStep>);
    };

    const handleDeleteOption = (stepId: string, optionIndex: number) => {
        const step = flow.steps.find(s => s.id === stepId) as SelectStep;
        if (!step) return;
        const newOptions = step.options.filter((_, i) => i !== optionIndex);
        handleUpdateStep(stepId, { options: newOptions } as Partial<SelectStep>);
    };

    // -- Image Handling --

    const handleImageClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedStepId) return;

        const previewUrl = URL.createObjectURL(file);
        setPendingUploads(prev => ({ ...prev, [selectedStepId]: file }));
        handleUpdateStep(selectedStepId, { image: previewUrl });
    };

    const handleRemoveImage = (stepId: string) => {
        const step = flow.steps.find(s => s.id === stepId);
        if (!step) return;

        if (pendingUploads[stepId]) {
            URL.revokeObjectURL(step.image!);
            const newPending = { ...pendingUploads };
            delete newPending[stepId];
            setPendingUploads(newPending);
        }
        handleUpdateStep(stepId, { image: null });
    };

    // -- Save --

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const stepsCopy = [...flow.steps];
            const uploadPromises = Object.entries(pendingUploads).map(async ([stepId, file]) => {
                const { uploadUrl, publicUrl } = await flowsRepo.getPresignedUrl(file.name, file.type);
                await flowsRepo.uploadFile(uploadUrl, file);
                const stepIndex = stepsCopy.findIndex(s => s.id === stepId);
                if (stepIndex !== -1) {
                    stepsCopy[stepIndex] = { ...stepsCopy[stepIndex], image: publicUrl };
                }
            });

            await Promise.all(uploadPromises);
            const updatedFlow = { ...flow, steps: stepsCopy };

            if (initialFlow.id === "new" || flow.id === "new") {
                // Create
                await flowsRepo.create(updatedFlow);
                alert("Flow created successfully!");
            } else {
                // Update
                await flowsRepo.update(flow.id, updatedFlow);
                alert("Flow saved successfully!");
            }

            setFlow(updatedFlow);
            setPendingUploads({});
            setIsSaving(false);
            router.push("/flows"); // Optional: stay on page to continue editing
        } catch (error) {
            console.error("Failed to save flow", error);
            alert("Failed to save flow. Please try again.");
            setIsSaving(false);
        }
    };

    // -- Render Helpers --

    const filteredSteps = flow.steps.filter(s =>
        searchTerm ? s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.type === "Question" && (s as QuestionStep).text.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.type === "Form" && (s as FormStep).title.toLowerCase().includes(searchTerm.toLowerCase()))
            : true
    );

    const StepSelector = ({ value, onChange, placeholder = "Select next step..." }: { value?: string | null | undefined, onChange: (val: string) => void, placeholder?: string }) => {
        // Calculate usage of steps to filter allowed options
        // Rule: A Form step can only be used by ONE parent step.
        // Rule: Self-referencing is not allowed.

        const isOptionDisabled = (step: FlowStep) => {
            // 1. Prevent Self-Loop
            if (selectedStep && step.id === selectedStep.id) return true;

            // 2. Unique Form Assignment
            if (step.type === "Form") {
                // Check if this form is used by ANY OTHER step (not the current one)
                const isUsedByOther = flow.steps.some(parent => {
                    if (!selectedStep || parent.id === selectedStep.id) return false; // Ignore current step or if no selection

                    // Check if parent refers to 'step.id'
                    if (parent.type === "Question") {
                        if ((parent as QuestionStep).yesNext === step.id) return true;
                        if ((parent as QuestionStep).noNext === step.id) return true;
                    }
                    if (parent.type === "Select") {
                        if ((parent as SelectStep).options.some(o => o.next === step.id)) return true;
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
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
                <option value="">{placeholder}</option>
                {flow.steps.map(s => {
                    const disabled = isOptionDisabled(s);
                    // If it's disabled, verify if we should hide it or show it disabled.
                    // Generally simpler to hide invalid options or show them disabled. User asked "traer como opciones", implies filtering.
                    // But if it's currently selected (value === s.id), we MUST show it, even if momentarily invalid? 
                    // Actually my logic for isUsedByOther explicitly ignores current step, so it shouldn't be disabled if WE are the ones using it.

                    if (disabled) return null; // Hide option

                    return (
                        <option key={s.id} value={s.id}>
                            {s.id} ({s.type})
                        </option>
                    );
                })}
            </select>
        )
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-1 group/header">
                <div className="flex-1 space-y-2">
                    <input
                        value={flow.title}
                        onChange={(e) => setFlow({ ...flow, title: e.target.value })}
                        className="text-2xl font-bold bg-transparent border border-gray-200 focus:border-gray-300 focus:bg-white rounded-md p-2 -ml-2 w-full placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-gray-100"
                        placeholder="Untitled Flow"
                    />
                    <input
                        value={flow.description ?? ""}
                        onChange={(e) => setFlow({ ...flow, description: e.target.value })}
                        className="text-sm text-gray-500 bg-transparent border border-gray-200 focus:border-gray-300 focus:bg-white rounded-md p-2 -ml-2 w-full placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-gray-100"
                        placeholder="Add a description..."
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        className={cn("gap-2 shadow-sm transition-all", isSaving ? "opacity-80" : "hover:ring-2 hover:ring-offset-1 hover:ring-black")}
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isSaving ? "Saving..." : "Save Flow"}
                    </Button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex gap-4 min-h-0">

                {/* -- Sidebar -- */}
                <Card className="w-80 flex flex-col shrink-0">
                    <CardHeader className="p-4 border-b pb-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search steps..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredSteps.map((step) => (
                            <div
                                key={step.id}
                                onClick={() => setSelectedStepId(step.id)}
                                className={cn(
                                    "p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 group relative",
                                    selectedStepId === step.id ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200" : "border-gray-100 bg-white"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {step.type === "Question" && <HelpCircle className="h-3.5 w-3.5 text-blue-500" />}
                                    {step.type === "Form" && <FileText className="h-3.5 w-3.5 text-green-500" />}
                                    {step.type === "Select" && <List className="h-3.5 w-3.5 text-purple-500" />}
                                    {step.type === "End" && <X className="h-3.5 w-3.5 text-gray-500" />}
                                    <span className="text-xs font-bold text-gray-700">{step.id}</span>
                                    <span className="text-[10px] uppercase text-gray-400 ml-auto">{step.type}</span>
                                </div>
                                <div className="text-sm text-gray-600 line-clamp-2 leading-tight">
                                    {step.type === "Question" ? (step as QuestionStep).text
                                        : step.type === "Form" ? (step as FormStep).title
                                            : step.type === "Select" ? ((step as SelectStep).title || (step as SelectStep).text)
                                                : "End of flow"}
                                </div>
                                {/* Quick delete on hover */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 bg-white shadow-sm p-1 rounded-md text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}

                        <div className="pt-4 border-t mt-4 px-2">
                            <Label className="text-xs text-center block mb-2 text-gray-400 uppercase font-semibold">Add New Step</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {STEP_TYPES.map(type => (
                                    <Button
                                        key={type}
                                        onClick={() => handleAddStep(type)}
                                        className="text-xs h-9 bg-black text-white hover:bg-gray-800 shadow-md border-none"
                                    >
                                        {type}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* -- Detail View -- */}
                <div className="flex-1 flex flex-col min-w-0">
                    {selectedStep ? (
                        <Card className="flex-1 flex flex-col overflow-hidden">
                            <CardHeader className="border-b bg-gray-50/50 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center font-bold text-gray-600 shadow-inner">
                                            {selectedStep.type[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-lg font-bold text-gray-900">{selectedStep.id}</h2>
                                                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-700">{selectedStep.type}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">Editing step details</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedStep.image ? (
                                            <div className="relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={selectedStep.image} alt="Step" className="h-12 w-12 object-cover rounded-md border" />
                                                <button onClick={() => handleRemoveImage(selectedStep.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button onClick={handleImageClick} className="w-full h-8 px-3 gap-2 bg-black text-white hover:bg-gray-800 shadow-sm border-none">
                                                <ImagePlus className="h-4 w-4" /> Add Image
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Common ID Field */}
                                <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                    <Label className="mt-2 text-right text-gray-500">Step ID</Label>
                                    <Input value={selectedStep.id} onChange={(e) => handleUpdateStep(selectedStep.id, { id: e.target.value })} />
                                </div>

                                {selectedStep.type === "Question" && (
                                    <>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Question Text</Label>
                                            <Textarea
                                                value={(selectedStep as QuestionStep).text}
                                                placeholder="Enter question text"
                                                onChange={(e) => handleUpdateStep(selectedStep.id, { text: e.target.value })}
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Yes <ArrowRight className="inline h-3 w-3" /></Label>
                                            <StepSelector
                                                value={(selectedStep as QuestionStep).yesNext}
                                                onChange={(id) => handleUpdateStep(selectedStep.id, { ...selectedStep, yesNext: id } as QuestionStep)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">No <ArrowRight className="inline h-3 w-3" /></Label>
                                            <StepSelector
                                                value={(selectedStep as QuestionStep).noNext}
                                                onChange={(id) => handleUpdateStep(selectedStep.id, { ...selectedStep, noNext: id } as QuestionStep)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Barrier ID</Label>
                                            <Input
                                                value={(selectedStep as QuestionStep).barrierId || ""}
                                                onChange={(e) => handleUpdateStep(selectedStep.id, { ...selectedStep, barrierId: e.target.value } as QuestionStep)}
                                                placeholder="e.g. AR-B01"
                                            />
                                        </div>
                                    </>
                                )}

                                {selectedStep.type === "Select" && (
                                    <>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Title / Text</Label>
                                            <Textarea
                                                value={(selectedStep as SelectStep).title || (selectedStep as SelectStep).text || ""}
                                                onChange={(e) => handleUpdateStep(selectedStep.id, { title: e.target.value, text: e.target.value })}
                                                rows={2}
                                            />
                                        </div>

                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Options</Label>
                                            <div className="space-y-3">
                                                {(selectedStep as SelectStep).options.map((option, idx) => (
                                                    <div key={idx} className="p-3 bg-gray-50 border rounded-lg space-y-3 relative group">
                                                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                                                            <span className="text-xs font-bold text-gray-400">LABEL</span>
                                                            <Input
                                                                value={option.label}
                                                                onChange={(e) => handleUpdateOption(selectedStep.id, idx, "label", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                                                            <span className="text-xs font-bold text-gray-400">NEXT</span>
                                                            <StepSelector
                                                                value={option.next}
                                                                onChange={(val) => handleUpdateOption(selectedStep.id, idx, "next", val)}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                                                            <span className="text-xs font-bold text-gray-400">BARRIER</span>
                                                            <Input
                                                                value={option.barrierId || ""}
                                                                onChange={(e) => handleUpdateOption(selectedStep.id, idx, "barrierId", e.target.value)}
                                                                placeholder="Optional Barrier ID"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteOption(selectedStep.id, idx)}
                                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <Button onClick={() => handleAddOption(selectedStep.id)} className="w-full h-8 px-3 gap-2 bg-black text-white hover:bg-gray-800 shadow-sm border-none">
                                                    <Plus className="h-4 w-4" /> Add Option
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {selectedStep.type === "Form" && (
                                    <>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Title</Label>
                                            <Input
                                                value={(selectedStep as FormStep).title}
                                                onChange={(e) => handleUpdateStep(selectedStep.id, { title: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Next Step</Label>
                                            <StepSelector
                                                value={(selectedStep as FormStep).next}
                                                onChange={(id) => handleUpdateStep(selectedStep.id, { ...selectedStep, next: id } as FormStep)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Fields</Label>
                                            <div className="space-y-2">
                                                {(selectedStep as FormStep).fields.map((field, fIdx) => (
                                                    <div key={fIdx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border">
                                                        <div className="w-20 text-xs font-mono text-gray-500 shrink-0">{field.type}</div>
                                                        <Input
                                                            className="h-8 text-sm"
                                                            value={field.label}
                                                            onChange={(e) => handleUpdateField(selectedStep.id, fIdx, { label: e.target.value })}
                                                        />
                                                        {field.id === "measurements" && (
                                                            <select
                                                                value={field.unit ?? '"'}
                                                                onChange={(e) => handleUpdateField(selectedStep.id, fIdx, { unit: e.target.value })}
                                                                className="h-8 text-sm border-gray-300 rounded-md"
                                                            >
                                                                <option value={'"'}>in (")</option>
                                                                <option value={'cm'}>cm</option>
                                                                <option value={'%'}>%</option>
                                                            </select>
                                                        )}
                                                        <button onClick={() => handleDeleteField(selectedStep.id, fIdx)} className="text-gray-400 hover:text-red-500">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <Button onClick={() => handleAddField(selectedStep.id)} className="w-full h-8 text-xs bg-black text-white hover:bg-gray-800 shadow-sm border-none">
                                                    <Plus className="h-3 w-3 mr-1" /> Add Field
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed m-4">
                            <CornerDownRight className="h-10 w-10 mb-2 opacity-20" />
                            <p>Select a step from the sidebar to edit</p>
                        </div>
                    )}
                </div>
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
