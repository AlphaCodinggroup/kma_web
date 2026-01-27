"use client";

import React from "react";
import type { Flow, FormStep, QuestionStep, SelectStep, FlowStep, FormField, EndStep, Condition, ConditionalNext, StepMetadata } from "@entities/flow/model";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { Button, Input, Label, Textarea } from "@shared/ui/controls";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@shared/ui/modal";
import { ImagePlus, Save, Trash2, Plus, Loader2, Search, ArrowRight, CornerDownRight, FileText, HelpCircle, List, AlertCircle, X, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { flowsRepo } from "@features/flows/api/flows.repo.impl";
import { cn } from "@shared/lib/cn";
import { useRouter } from "next/navigation";
import { Loading } from "@shared/ui/Loading";
import { useQueryClient } from "@tanstack/react-query";
import { flowsKeys } from "@features/flows/lib/useFlowsQuery";

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
    const queryClient = useQueryClient();

    // Feedback Modal State
    const [feedback, setFeedback] = React.useState<{
        open: boolean;
        type: "success" | "error";
        title: string;
        messages: string[];
    }>({ open: false, type: "success", title: "", messages: [] });

    // Auto-link Modal State
    const [autoLinkModal, setAutoLinkModal] = React.useState<{
        open: boolean;
        newStepId: string;
        newStepType: FlowStep["type"];
        availableFields: Array<{ field: string; label: string }>; // All available empty fields to link to
    } | null>(null);

    // Help Modal State
    const [showHelpModal, setShowHelpModal] = React.useState(false);

    const validateFlow = (currentFlow: Flow): string[] => {
        const errors: string[] = [];

        if (!currentFlow.title.trim()) errors.push("Flow Title is required.");
        if (!currentFlow.description?.trim()) errors.push("Flow Description is required.");

        if (currentFlow.steps.length === 0) {
            errors.push("Flow must have at least one step.");
        }

        currentFlow.steps.forEach(step => {
            if (step.type === "Question") {
                const s = step as QuestionStep;
                if (!s.text.trim()) errors.push(`Step ${s.id}: Question text is required.`);
                if (!s.yesNext) errors.push(`Step ${s.id}: 'Yes Next' step is required.`);
                if (!s.noNext) errors.push(`Step ${s.id}: 'No Next' step is required.`);
            }
            if (step.type === "Form") {
                const s = step as FormStep;
                if (!s.title.trim()) errors.push(`Step ${s.id}: Form title is required.`);
                if (!s.next) errors.push(`Step ${s.id}: 'Next Step' is required.`);
                if (s.fields.length === 0) errors.push(`Step ${s.id}: At least one field is required.`);
            }
            if (step.type === "Select") {
                const s = step as SelectStep;
                const title = s.title || s.text || "";
                if (!title.trim()) errors.push(`Step ${s.id}: Title/Text is required.`);
                if (s.options.length === 0) errors.push(`Step ${s.id}: At least one option is required.`);
                s.options.forEach((opt, idx) => {
                    if (!opt.next) errors.push(`Step ${s.id} (Option ${idx + 1}): 'Next Step' is required.`);
                });
            }
        });

        return errors;
    };

    const selectedStep = flow.steps.find(s => s.id === selectedStepId);

    // Helper: Check if a step has incomplete references
    const isStepIncomplete = (step: FlowStep): boolean => {
        if (step.type === "Question") {
            const q = step as QuestionStep;
            return !q.yesNext || !q.noNext;
        }
        if (step.type === "Form") {
            const f = step as FormStep;
            return !f.next;
        }
        if (step.type === "Select") {
            const s = step as SelectStep;
            return s.options.some(opt => !opt.next);
        }
        return false;
    };

    if (isSaving) {
        return <Loading text="Saving..." />;
    }

    // -- Step Management --

    // Helper: Find all empty fields in selected step that can link to new step
    const findEmptyLinkFields = (step: FlowStep | undefined): Array<{ field: string; label: string }> => {
        if (!step) return [];

        const fields: Array<{ field: string; label: string }> = [];

        if (step.type === "Question") {
            const q = step as QuestionStep;
            if (!q.yesNext) fields.push({ field: "yesNext", label: "Yes" });
            if (!q.noNext) fields.push({ field: "noNext", label: "No" });
        }
        if (step.type === "Form") {
            const f = step as FormStep;
            if (!f.next) fields.push({ field: "next", label: "Next" });
        }
        if (step.type === "Select") {
            const s = step as SelectStep;
            s.options.forEach((opt, idx) => {
                if (!opt.next) {
                    fields.push({ field: `option:${idx}`, label: `Option ${idx + 1}: "${opt.label}"` });
                }
            });
        }
        return fields;
    };

    const handleAddStep = (type: FlowStep["type"], autoLinkTo?: { stepId: string; field: string }) => {
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

        // If autoLinkTo is provided, link immediately (inline create)
        if (autoLinkTo) {
            const { stepId, field } = autoLinkTo;
            const targetStep = newSteps.find(s => s.id === stepId);

            if (targetStep) {
                // Update the target step with the new link in the same state update
                const updatedSteps = newSteps.map(s => {
                    if (s.id !== stepId) return s;

                    if (field === "yesNext" || field === "noNext") {
                        return { ...s, [field]: newId } as QuestionStep;
                    } else if (field === "next") {
                        return { ...s, next: newId } as FormStep;
                    } else if (field.startsWith("option:")) {
                        const optionIdx = parseInt(field.split(":")[1]);
                        const selectStep = s as SelectStep;
                        const newOptions = [...selectStep.options];
                        newOptions[optionIdx] = { ...newOptions[optionIdx], next: newId };
                        return { ...selectStep, options: newOptions };
                    }
                    return s;
                });

                setFlow({ ...flow, steps: updatedSteps });
            } else {
                setFlow({ ...flow, steps: newSteps });
            }

            // Select the new step immediately
            setSelectedStepId(newId);
        } else {
            setFlow({ ...flow, steps: newSteps });

            // Check if we should offer auto-linking (existing behavior for sidebar create)
            const emptyFields = findEmptyLinkFields(selectedStep);
            if (emptyFields.length > 0 && selectedStep) {
                setAutoLinkModal({
                    open: true,
                    newStepId: newId,
                    newStepType: type,
                    availableFields: emptyFields
                });
            } else {
                setSelectedStepId(newId);
            }
        }
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
        const errors = validateFlow(flow);
        if (errors.length > 0) {
            setFeedback({
                open: true,
                type: "error",
                title: "Validation Error",
                messages: errors
            });
            return;
        }

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

            // Auto-calculate shared quantity barriers
            const finalSteps = stepsCopy.map(step => {
                if (step.type !== 'Form') return step;

                // For each Form step, check if it's a target of any Conditional Navigation
                // Logic:
                // 1. Find all "Source Steps" that point to this 'step.id' via a conditional path
                // 2. Collect Barrier IDs from:
                //    a. The Source Step itself (e.g. Question's barrier_id)
                //    b. The Conditions (e.g. barrier_id from the Select Option referenced in the condition)

                const linkedBarriers = new Set<string>();

                stepsCopy.forEach(sourceStep => {
                    if (sourceStep.type !== 'Question') return; // Only Questions have conditional navigation currently

                    const qStep = sourceStep as QuestionStep;
                    const conditionals = [qStep.conditionalYesNext, qStep.conditionalNoNext].filter(Boolean);

                    conditionals.forEach(condNav => {
                        if (condNav!.next === step.id) {
                            // Source Step Barrier ID
                            if (qStep.barrierId) linkedBarriers.add(qStep.barrierId);

                            // Condition Barrier IDs
                            condNav!.conditions.forEach(condition => {
                                const refStep = stepsCopy.find(s => s.id === condition.step_id);
                                if (refStep) {
                                    if (refStep.type === 'Select') {
                                        const option = (refStep as SelectStep).options.find(o => o.label === condition.selected_option);
                                        if (option?.barrierId) linkedBarriers.add(option.barrierId);
                                    } else if (refStep.type === 'Question') {
                                        if ((refStep as QuestionStep).barrierId) linkedBarriers.add((refStep as QuestionStep).barrierId!);
                                    }
                                }
                            });
                        }
                    });
                });

                const barriersList = Array.from(linkedBarriers).sort();

                if (barriersList.length > 0) {
                    return {
                        ...step,
                        metadata: {
                            ...step.metadata,
                            sharedQuantity: { appliesToBarriers: barriersList }
                        }
                    };
                } else {
                    // Check if we should clear existing sharedQuantity if no links found? 
                    // Or keep manual if present?
                    // User requested full automation "que lo armes por detras", so we rely on this calculation.
                    // If no links found, we clear it to avoid stale data.
                    const newMetadata = { ...step.metadata };
                    if (newMetadata.sharedQuantity) delete newMetadata.sharedQuantity;
                    return { ...step, metadata: newMetadata };
                }
            });

            const updatedFlow = { ...flow, steps: finalSteps };

            if (initialFlow.id === "new" || flow.id === "new") {
                await flowsRepo.create(updatedFlow);
                queryClient.invalidateQueries({ queryKey: flowsKeys.list() });
            } else {
                await flowsRepo.update(flow.id, updatedFlow);
                queryClient.invalidateQueries({ queryKey: flowsKeys.detail(flow.id) });
                queryClient.invalidateQueries({ queryKey: flowsKeys.list() });
            }

            setFlow(updatedFlow);
            setPendingUploads({});
            setIsSaving(false);

            // Show Success Modal
            setFeedback({
                open: true,
                type: "success",
                title: "Flow Saved",
                messages: ["The flow has been successfully saved."]
            });

        } catch (error) {
            console.error("Failed to save flow", error);
            setIsSaving(false);
            setFeedback({
                open: true,
                type: "error",
                title: "Save Failed",
                messages: ["An unexpected error occurred while saving. Please try again."]
            });
        }
    };

    const handleCloseFeedback = () => {
        setFeedback(prev => ({ ...prev, open: false }));
        if (feedback.type === "success") {
            router.push("/flows");
        }
    };

    // Auto-link handlers
    const handleConfirmAutoLink = (targetField: string) => {
        if (!autoLinkModal || !selectedStep) return;

        const { newStepId } = autoLinkModal;

        // Special case: "both" for Questions - link to both yesNext and noNext
        if (targetField === "both" && selectedStep.type === "Question") {
            handleUpdateStep(selectedStep.id, {
                yesNext: newStepId,
                noNext: newStepId
            } as Partial<QuestionStep>);
        } else if (targetField === "yesNext" || targetField === "noNext") {
            handleUpdateStep(selectedStep.id, { [targetField]: newStepId } as Partial<QuestionStep>);
        } else if (targetField === "next") {
            handleUpdateStep(selectedStep.id, { next: newStepId } as Partial<FormStep>);
        } else if (targetField.startsWith("option:")) {
            const optionIdx = parseInt(targetField.split(":")[1]);
            const selectStep = selectedStep as SelectStep;
            const newOptions = [...selectStep.options];
            newOptions[optionIdx] = { ...newOptions[optionIdx], next: newStepId };
            handleUpdateStep(selectedStep.id, { options: newOptions } as Partial<SelectStep>);
        }

        setSelectedStepId(newStepId);
        setAutoLinkModal(null);
    };

    const handleCancelAutoLink = () => {
        if (autoLinkModal) {
            setSelectedStepId(autoLinkModal.newStepId);
        }
        setAutoLinkModal(null);
    };

    // -- Conditional Navigation Component --

    const ConditionalNavEditor: React.FC<{
        label: string;
        description: string;
        conditional: ConditionalNext | undefined;
        onChange: (conditional: ConditionalNext | undefined) => void;
        currentStepId: string;
        flow: Flow;
    }> = ({ label, description, conditional, onChange, currentStepId, flow }) => {
        const [isExpanded, setIsExpanded] = React.useState(!!conditional);
        const [isEnabled, setIsEnabled] = React.useState(!!conditional);

        // Get steps that appear before current step (can be referenced in conditions)
        const currentStepIndex = flow.steps.findIndex(s => s.id === currentStepId);
        const availableSteps = flow.steps.slice(0, currentStepIndex);

        // Get select options for a given step
        const getSelectOptions = (stepId: string): string[] => {
            const step = flow.steps.find(s => s.id === stepId);
            if (step && step.type === "Select") {
                return (step as SelectStep).options.map(opt => opt.label);
            }
            return [];
        };

        const handleToggle = (enabled: boolean) => {
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
            <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                <Label className="mt-2 text-right text-gray-500">{label}</Label>
                <div className="space-y-3">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => handleToggle(e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded"
                            />
                            <span className="text-sm font-medium text-purple-900">{label}</span>
                            {isEnabled && conditional && (
                                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                                    {conditional.conditions.length} condition(s)
                                </span>
                            )}
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-purple-600" /> : <ChevronDown className="h-4 w-4 text-purple-600" />}
                    </button>

                    {isExpanded && isEnabled && conditional && (
                        <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/30 space-y-4">
                            <p className="text-xs text-gray-600">{description}</p>

                            {/* Target Step */}
                            <div>
                                <Label className="text-sm mb-1 block">Target Step (when conditions match)</Label>
                                <select
                                    value={conditional.next || ""}
                                    onChange={(e) => onChange({ ...conditional, next: e.target.value })}
                                    className="w-full rounded-lg bg-white border border-gray-300 text-gray-900 text-sm focus:ring-purple-500 focus:border-purple-500 p-2"
                                >
                                    <option value="">Select target step...</option>
                                    {flow.steps.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.id} ({s.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Match Logic */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`match-any-${label}`}
                                    checked={conditional.match_any || false}
                                    onChange={(e) => onChange({ ...conditional, match_any: e.target.checked })}
                                    className="rounded"
                                />
                                <Label htmlFor={`match-any-${label}`} className="text-sm cursor-pointer">
                                    Match ANY condition (OR logic) - default is ALL (AND logic)
                                </Label>
                            </div>

                            {/* Conditions List */}
                            <div>
                                <Label className="text-sm mb-2 block">Conditions</Label>
                                <div className="space-y-2">
                                    {conditional.conditions.map((condition, idx) => {
                                        const selectedStep = flow.steps.find(s => s.id === condition.step_id);
                                        return (
                                            <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 space-y-2">
                                                        {/* Step Selection */}
                                                        <select
                                                            value={condition.step_id}
                                                            onChange={(e) => {
                                                                const stepId = e.target.value;
                                                                // Reset answer/option when changing step by only passing step_id
                                                                handleUpdateCondition(idx, { step_id: stepId });
                                                            }}
                                                            className="w-full rounded-md bg-gray-50 border border-gray-300 text-sm p-1.5"
                                                        >
                                                            <option value="">Select step...</option>
                                                            {availableSteps.map(s => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.id} ({s.type})
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {/* Question Answer Selection */}
                                                        {selectedStep?.type === "Question" && (
                                                            <select
                                                                value={condition.answer || ""}
                                                                onChange={(e) => handleUpdateCondition(idx, { answer: e.target.value as "YES" | "NO" })}
                                                                className="w-full rounded-md bg-gray-50 border border-gray-300 text-sm p-1.5"
                                                            >
                                                                <option value="">Select answer...</option>
                                                                <option value="YES">YES</option>
                                                                <option value="NO">NO</option>
                                                            </select>
                                                        )}

                                                        {/* Select Option Selection */}
                                                        {selectedStep?.type === "Select" && (
                                                            <select
                                                                value={condition.selected_option || ""}
                                                                onChange={(e) => handleUpdateCondition(idx, { selected_option: e.target.value })}
                                                                className="w-full rounded-md bg-gray-50 border border-gray-300 text-sm p-1.5"
                                                            >
                                                                <option value="">Select option...</option>
                                                                {getSelectOptions(condition.step_id).map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteCondition(idx)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <Button
                                        onClick={handleAddCondition}
                                        className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Add Condition
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // -- Render Helpers --

    const filteredSteps = flow.steps.filter(s =>
        searchTerm ? s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.type === "Question" && (s as QuestionStep).text.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.type === "Form" && (s as FormStep).title.toLowerCase().includes(searchTerm.toLowerCase()))
            : true
    );

    const StepSelector = ({ value, onChange, placeholder = "Select next step...", stepId, field }: {
        value?: string | null | undefined,
        onChange: (val: string) => void,
        placeholder?: string,
        stepId?: string,
        field?: string
    }) => {
        const [showCreateMenu, setShowCreateMenu] = React.useState(false);
        const createButtonRef = React.useRef<HTMLDivElement>(null);

        // Close menu when clicking outside
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (createButtonRef.current && !createButtonRef.current.contains(event.target as Node)) {
                    setShowCreateMenu(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleCreateAndLink = (type: FlowStep["type"]) => {
            if (stepId && field) {
                handleAddStep(type, { stepId, field });
            }
            setShowCreateMenu(false);
        };

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
            <div className="flex items-center gap-2">
                <select
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    <option value="">{placeholder}</option>
                    {flow.steps.map(s => {
                        const disabled = isOptionDisabled(s);
                        if (disabled) return null; // Hide option

                        return (
                            <option key={s.id} value={s.id}>
                                {s.id} ({s.type})
                            </option>
                        );
                    })}
                </select>

                {/* Create & Link Button */}
                {stepId && field && (
                    <div className="relative" ref={createButtonRef}>
                        <button
                            onClick={() => setShowCreateMenu(!showCreateMenu)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
                            title="Create new step and link here"
                        >
                            <Plus className="h-4 w-4" />
                            Create
                        </button>

                        {showCreateMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                                {STEP_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => handleCreateAndLink(type)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                                    >
                                        {type === "Question" && <HelpCircle className="h-4 w-4 text-blue-500" />}
                                        {type === "Form" && <FileText className="h-4 w-4 text-green-500" />}
                                        {type === "Select" && <List className="h-4 w-4 text-purple-500" />}
                                        {type === "End" && <CheckCircle2 className="h-4 w-4 text-gray-500" />}
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-1 group/header">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <input
                            value={flow.title}
                            onChange={(e) => setFlow({ ...flow, title: e.target.value })}
                            className="text-2xl font-bold bg-transparent border border-gray-200 focus:border-gray-300 focus:bg-white rounded-md p-2 -ml-2 flex-1 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-gray-100"
                            placeholder="Untitled Flow"
                        />
                        <button
                            onClick={() => setShowHelpModal(true)}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="How to create a flow"
                        >
                            <Info className="h-5 w-5" />
                        </button>
                    </div>
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
                        {filteredSteps.map((step) => {
                            const incomplete = isStepIncomplete(step);
                            return (
                                <div
                                    key={step.id}
                                    onClick={() => setSelectedStepId(step.id)}
                                    className={cn(
                                        "p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 group relative",
                                        selectedStepId === step.id ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200" : "border-gray-100 bg-white",
                                        incomplete && "border-amber-200 bg-amber-50/30"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {step.type === "Question" && <HelpCircle className="h-3.5 w-3.5 text-blue-500" />}
                                        {step.type === "Form" && <FileText className="h-3.5 w-3.5 text-green-500" />}
                                        {step.type === "Select" && <List className="h-3.5 w-3.5 text-purple-500" />}
                                        {step.type === "End" && <X className="h-3.5 w-3.5 text-gray-500" />}
                                        <span className="text-xs font-bold text-gray-700">{step.id}</span>
                                        {incomplete && (
                                            <div className="ml-auto flex items-center gap-1 text-amber-600" title="Incomplete: missing step references">
                                                <AlertTriangle className="h-3 w-3" />
                                            </div>
                                        )}
                                        {!incomplete && <span className="text-[10px] uppercase text-gray-400 ml-auto">{step.type}</span>}
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
                            );
                        })}

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
                                                stepId={selectedStep.id}
                                                field="yesNext"
                                            />
                                        </div>
                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">No <ArrowRight className="inline h-3 w-3" /></Label>
                                            <StepSelector
                                                value={(selectedStep as QuestionStep).noNext}
                                                onChange={(id) => handleUpdateStep(selectedStep.id, { ...selectedStep, noNext: id } as QuestionStep)}
                                                stepId={selectedStep.id}
                                                field="noNext"
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

                                        {/* Conditional YES Navigation */}
                                        <ConditionalNavEditor
                                            label="Conditional YES Navigation"
                                            description="Alternate navigation when YES is answered AND conditions are met"
                                            conditional={(selectedStep as QuestionStep).conditionalYesNext}
                                            onChange={(conditionalYesNext) => handleUpdateStep(selectedStep.id, { ...selectedStep, conditionalYesNext } as QuestionStep)}
                                            currentStepId={selectedStep.id}
                                            flow={flow}
                                        />

                                        {/* Conditional NO Navigation */}
                                        <ConditionalNavEditor
                                            label="Conditional NO Navigation"
                                            description="Alternate navigation when NO is answered AND conditions are met"
                                            conditional={(selectedStep as QuestionStep).conditionalNoNext}
                                            onChange={(conditionalNoNext) => handleUpdateStep(selectedStep.id, { ...selectedStep, conditionalNoNext } as QuestionStep)}
                                            currentStepId={selectedStep.id}
                                            flow={flow}
                                        />
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
                                                                stepId={selectedStep.id}
                                                                field={`option:${idx}`}
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
                                                stepId={selectedStep.id}
                                                field="next"
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



                                        <div className="grid grid-cols-[150px_1fr] gap-6 items-start">
                                            <Label className="mt-2 text-right text-gray-500">Shared Quantity</Label>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground font-normal">
                                                    If this form captures a quantity shared across multiple barriers, the system will <strong>automatically detect</strong> the relevant Barrier IDs based on the conditional navigation steps pointing here.
                                                </Label>
                                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900">
                                                    <Info className="h-3 w-3 inline mr-1 mb-0.5" />
                                                    Barrier IDs will be calculated and saved automatically when you click "Save Flow".
                                                    <br />
                                                    Current detected barriers (saved): <span className="font-mono">{(selectedStep as FormStep).metadata?.sharedQuantity?.appliesToBarriers.join(", ") || "(None)"}</span>
                                                </div>
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

            {/* Feedback Modal */}
            <Modal open={feedback.open} onOpenChange={(open) => !open && handleCloseFeedback()}>
                <ModalContent className="max-w-md p-6">
                    <ModalHeader className="flex flex-col items-center gap-4 text-center">
                        <div className={cn("p-3 rounded-full", feedback.type === "success" ? "bg-green-100" : "bg-red-100")}>
                            {feedback.type === "success" ? (
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            ) : (
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            )}
                        </div>
                        <ModalTitle className={cn("text-xl", feedback.type === "success" ? "text-green-700" : "text-red-700")}>
                            {feedback.title}
                        </ModalTitle>
                    </ModalHeader>

                    <div className="space-y-3">
                        {feedback.messages.map((msg, i) => (
                            <div key={i} className={cn("text-sm p-2 rounded-md flex items-start gap-2", feedback.type === "error" ? "bg-red-50 text-red-800" : "text-gray-600 text-center justify-center")}>
                                {feedback.type === "error" && <span className="opacity-70">•</span>}
                                {msg}
                            </div>
                        ))}
                    </div>

                    <ModalFooter className="justify-center mt-6">
                        <Button onClick={handleCloseFeedback} className={cn("w-full", feedback.type === "error" ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-gray-800")}>
                            {feedback.type === "success" ? "Continue" : "Fix Errors"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Auto-Link Modal */}
            <Modal open={autoLinkModal?.open ?? false} onOpenChange={(open) => !open && handleCancelAutoLink()}>
                <ModalContent className="max-w-md p-6">
                    <ModalHeader className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 rounded-full bg-blue-100">
                            <ArrowRight className="w-8 h-8 text-blue-600" />
                        </div>
                        <ModalTitle className="text-xl text-blue-700">
                            Link New Step?
                        </ModalTitle>
                        <ModalDescription className="text-sm text-gray-600">
                            {autoLinkModal && selectedStep && (
                                <>
                                    Connect <span className="font-semibold text-gray-900">{autoLinkModal.newStepId}</span> ({autoLinkModal.newStepType}) to <span className="font-semibold text-gray-900">{selectedStep.id}</span>
                                </>
                            )}
                        </ModalDescription>
                    </ModalHeader>

                    <ModalFooter className="flex flex-col gap-2 mt-6">
                        {/* Special "Both" button for Questions with both fields empty */}
                        {selectedStep?.type === "Question" &&
                            autoLinkModal?.availableFields.length === 2 &&
                            autoLinkModal.availableFields.some(f => f.field === "yesNext") &&
                            autoLinkModal.availableFields.some(f => f.field === "noNext") && (
                                <Button
                                    onClick={() => handleConfirmAutoLink("both")}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-between"
                                >
                                    <span>Link to:</span>
                                    <span className="font-mono text-sm bg-green-700/50 px-2 py-0.5 rounded">
                                        Both (Yes & No)
                                    </span>
                                </Button>
                            )}

                        {/* Individual field buttons */}
                        {autoLinkModal?.availableFields.map((fieldOption) => (
                            <Button
                                key={fieldOption.field}
                                onClick={() => handleConfirmAutoLink(fieldOption.field)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-between"
                            >
                                <span>Link to:</span>
                                <span className="font-mono text-sm bg-blue-700/50 px-2 py-0.5 rounded">
                                    {fieldOption.label}
                                </span>
                            </Button>
                        ))}
                        <Button onClick={handleCancelAutoLink} className="w-full bg-gray-700 text-white hover:bg-gray-800 mt-2">
                            Skip
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Help Modal */}
            <Modal open={showHelpModal} onOpenChange={setShowHelpModal}>
                <ModalContent className="max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
                    <ModalHeader className="flex flex-col items-center gap-4 text-center pb-4 border-b">
                        <div className="p-3 rounded-full bg-blue-100">
                            <Info className="w-8 h-8 text-blue-600" />
                        </div>
                        <ModalTitle className="text-2xl text-blue-700">
                            How to Create a Flow
                        </ModalTitle>
                        <ModalDescription className="text-sm text-gray-600">
                            Step-by-step guide to building audit flows
                        </ModalDescription>
                    </ModalHeader>

                    <div className="space-y-6 mt-6">
                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                                Set Flow Details
                            </h3>
                            <p className="text-sm text-gray-600 ml-8">
                                Enter a title and description for your flow. This helps identify the purpose of the audit.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                                Create Steps (The Workflow)
                            </h3>
                            <div className="ml-8 space-y-3">
                                <p className="text-sm text-gray-700">
                                    A Flow is a sequence of steps. You typically start with a <strong>Select</strong> (to choose what to audit) or a <strong>Question</strong>.
                                </p>
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="font-medium text-sm text-green-800 mb-1 flex items-center gap-1">
                                        <span className="text-lg">⚡</span> Efficient Way: Inline Create
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Instead of creating steps one-by-one, just click the green <span className="font-mono bg-emerald-600 text-white px-1 rounded text-xs">+ Create</span> button inside any "Next Step" selector. This creates and links the new step in one go.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                                Step Types
                            </h3>
                            <div className="ml-8 space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                                    <div>
                                        <span className="font-medium">Question:</span> Yes/No branching. Use this to verify conditions (e.g. "Is the door width &gt; 32in?").
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <FileText className="h-4 w-4 text-green-500 mt-0.5" />
                                    <div>
                                        <span className="font-medium">Form:</span> The destination for data collection. Use this to record measurements, photos, or barrier quantities.
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <List className="h-4 w-4 text-purple-500 mt-0.5" />
                                    <div>
                                        <span className="font-medium">Select:</span> A menu of options. Useful for categorizing the audit area first.
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-gray-500 mt-0.5" />
                                    <div>
                                        <span className="font-medium">End:</span> Terminates the flow immediately.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                                Visual Checks
                            </h3>
                            <div className="ml-8 space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                    <div>
                                        <span className="font-medium text-amber-700">Incomplete Step:</span> Means a "Next Step" is missing. You must fill all links before saving.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">5</span>
                                Advanced: Double Dipping & Shared Forms
                            </h3>
                            <div className="ml-8 space-y-3 text-sm">
                                <p className="text-gray-700">
                                    <strong>"Double Dipping"</strong> allows you to reuse a single Form step for multiple different barriers or scenarios. This is powerful for grouping findings.
                                </p>

                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                                    <p className="font-semibold text-purple-900 text-xs uppercase">How to setup Double Dipping:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-1">
                                        <li>Create a single <strong>Form</strong> step (e.g. "Record Barrier Quantity").</li>
                                        <li>Create your <strong>Questions</strong> (e.g. "Is the door too heavy?", "Is the knob accessible?").</li>
                                        <li>
                                            In each Question, enable <span className="font-semibold text-purple-700">Conditional Navigation</span>.
                                        </li>
                                        <li>
                                            Add a condition (e.g. "If Answer is NO") and set the <strong>Target Step</strong> to your Shared Form.
                                        </li>
                                    </ol>
                                </div>

                                <div className="flex items-start gap-2 pt-1">
                                    <Info className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                    <div className="text-gray-600 text-xs">
                                        <strong>Auto-Calculation:</strong> When you save, the system automatically detects all the "Double Dippings" and calculates the "Shared Quantity" logic for you. You do not need to manually assign Barrier IDs to the Form.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">6</span>
                                Save Your Flow
                            </h3>
                            <p className="text-sm text-gray-600 ml-8">
                                Click <span className="font-semibold">Save Flow</span> when done. All steps must have valid connections.
                            </p>
                        </div>
                    </div>

                    <ModalFooter className="justify-center mt-6 pt-4 border-t">
                        <Button onClick={() => setShowHelpModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Got it!
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div >
    );
};
