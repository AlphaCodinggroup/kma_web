"use client";

import React from "react";
import type { Flow, FormStep, QuestionStep, SelectStep, FlowStep, FormField } from "@entities/flow/model";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import { Button, Input, Label } from "@shared/ui/controls";
import { Badge } from "@shared/ui/badge";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@shared/ui/modal";
import {
    Save,
    RotateCcw,
    Loader2,
    Download,
    Info,
    CheckCircle2,
    AlertCircle,
    List,
    X,
    Zap,
    HelpCircle,
    FileText,
    AlertTriangle
} from "lucide-react";
import { flowsRepo } from "@features/flows/api/flows.repo.impl";
import { sanitizeFileName } from "@shared/lib/file";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { flowsKeys } from "@features/flows/lib/useFlowsQuery";
import { useSession } from "@processes/auth/hooks";
import { FlowStepsTable } from "./FlowStepsTable";
import { StepDetailInspector } from "./StepDetailInspector";

const HELP_NUMBER = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--kma-primary)] text-sm text-[var(--kma-primary-contrast)]";

interface FlowEditorProps {
    initialFlow: Flow;
    mode?: "create" | "edit";
}

export const FlowEditor: React.FC<FlowEditorProps> = ({ initialFlow }) => {
    const [flow, setFlow] = React.useState<Flow>(initialFlow);
    const [selectedStepId, setSelectedStepId] = React.useState<string | null>(flow.steps[0]?.id || null);
    // Map<stepId, Map<blobUrl, File>> — rastreo 1:1 de preview url a archivo
    const [pendingUploads, setPendingUploads] = React.useState<Record<string, Map<string, File>>>({});
    const [isSaving, setIsSaving] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [stepsOpen, setStepsOpen] = React.useState(false);
    const [confirmation, setConfirmation] = React.useState<{ action: "discard" | "delete"; stepId?: string } | null>(null);
    const { isAdmin } = useSession();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const titleInputRef = React.useRef<HTMLInputElement>(null);
    const metadataId = React.useId();
    const [draggedStepId, setDraggedStepId] = React.useState<string | null>(null);
    const [dragOverStepId, setDragOverStepId] = React.useState<string | null>(null);

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
        availableFields: Array<{ field: string; label: string }>;
    } | null>(null);

    // Help Modal State
    const [showHelpModal, setShowHelpModal] = React.useState(false);

    // Draft Recovery Modal State
    const [showDraftRecoveryModal, setShowDraftRecoveryModal] = React.useState(false);
    const [recoveredDraft, setRecoveredDraft] = React.useState<Flow | null>(null);

    // Estado para verificar cambios pendientes
    const [lastSavedFlow, setLastSavedFlow] = React.useState<Flow>(initialFlow);

    // Zoomed Image Modal State
    const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);

    // LocalStorage key para el borrador
    const draftKey = `flow-editor-draft-${initialFlow.id}`;

    // Verificación de cambios sin guardar
    const hasUnsavedChanges = React.useMemo(() => {
        return JSON.stringify(flow) !== JSON.stringify(lastSavedFlow);
    }, [flow, lastSavedFlow]);

    // --- Protección contra pérdida de datos: beforeunload ---
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // --- Protección contra pérdida de datos: auto-save en localStorage ---
    React.useEffect(() => {
        if (!hasUnsavedChanges) return;

        const timeoutId = setTimeout(() => {
            try {
                const draftData = {
                    flow,
                    savedAt: new Date().toISOString(),
                };
                localStorage.setItem(draftKey, JSON.stringify(draftData));
            } catch (err) {
                console.warn("[FlowEditor] Failed to save draft to localStorage:", err);
            }
        }, 10000);

        return () => clearTimeout(timeoutId);
    }, [flow, hasUnsavedChanges, draftKey]);

    // --- Protección contra pérdida de datos: comprobar borrador en montaje ---
    React.useEffect(() => {
        try {
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft) as { flow: Flow; savedAt: string };
                if (JSON.stringify(parsed.flow) !== JSON.stringify(initialFlow)) {
                    setRecoveredDraft(parsed.flow);
                    setShowDraftRecoveryModal(true);
                }
            }
        } catch (err) {
            console.warn("[FlowEditor] Failed to load draft from localStorage:", err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Limpiar borrador de localStorage
    const clearDraft = () => {
        try {
            localStorage.removeItem(draftKey);
        } catch (err) {
            console.warn("[FlowEditor] Failed to clear draft:", err);
        }
    };

    const handleRecoverDraft = () => {
        if (recoveredDraft) {
            setFlow(recoveredDraft);
            setSelectedStepId(recoveredDraft.steps.some((step) => step.id === selectedStepId) ? selectedStepId : recoveredDraft.steps[0]?.id ?? null);
            setShowDraftRecoveryModal(false);
            setRecoveredDraft(null);
        }
    };

    const handleDiscardDraft = () => {
        clearDraft();
        setShowDraftRecoveryModal(false);
        setRecoveredDraft(null);
    };

    const handleClearFlow = () => setConfirmation({ action: "discard" });

    const confirmAction = () => {
        if (!confirmation || !isAdmin || isSaving) return;
        if (confirmation.action === "discard") {
            setFlow(initialFlow);
            clearDraft();
            setSelectedStepId(initialFlow.steps[0]?.id || null);
        } else {
            const newSteps = flow.steps.filter((step) => step.id !== confirmation.stepId);
            setFlow({ ...flow, steps: newSteps });
            if (selectedStepId === confirmation.stepId) setSelectedStepId(newSteps[0]?.id || null);
        }
        setConfirmation(null);
    };

    // Exportar el flujo como JSON
    const handleExport = () => {
        try {
            const jsonStr = JSON.stringify(flow, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const sanitizedTitle = (flow.title || "flow").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
            a.download = `${sanitizedTitle}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export flow:", err);
        }
    };

    const validateFlow = (currentFlow: Flow): string[] => {
        const errors: string[] = [];

        if (!currentFlow.title.trim()) errors.push("Flow Title is required.");
        if (currentFlow.steps.length === 0) {
            errors.push("Flow must have at least one step.");
        }

        const stepIdCounts = new Map<string, number>();
        currentFlow.steps.forEach((step) => {
            stepIdCounts.set(step.id, (stepIdCounts.get(step.id) || 0) + 1);
        });
        stepIdCounts.forEach((count, id) => {
            if (count > 1) {
                errors.push(`Duplicate Step ID "${id}": Step IDs must be unique across the flow.`);
            }
        });

        currentFlow.steps.forEach((step) => {
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

    const selectedStep = flow.steps.find((s) => s.id === selectedStepId) || null;

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
            return s.options.some((opt) => !opt.next);
        }
        return false;
    };

    // -- Drag and Drop --
    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, stepId: string) => {
        if (!isAdmin) return;
        setDraggedStepId(stepId);
        e.dataTransfer.setData("text/plain", stepId);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => {
            if (e.target instanceof HTMLElement) {
                e.target.classList.add("opacity-50");
            }
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, stepId: string) => {
        e.preventDefault();
        if (stepId !== draggedStepId) {
            setDragOverStepId(stepId);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>, stepId: string) => {
        e.preventDefault();
        if (dragOverStepId === stepId) {
            setDragOverStepId(null);
        }
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        setDraggedStepId(null);
        setDragOverStepId(null);
        if (e.target instanceof HTMLElement) {
            e.target.classList.remove("opacity-50");
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetStepId: string) => {
        e.preventDefault();
        if (!isAdmin || !draggedStepId || draggedStepId === targetStepId) {
            handleDragEnd(e);
            return;
        }

        const newSteps = [...flow.steps];
        const sourceIdx = newSteps.findIndex((s) => s.id === draggedStepId);
        const targetIdx = newSteps.findIndex((s) => s.id === targetStepId);

        if (sourceIdx !== -1 && targetIdx !== -1) {
            const [movedStep] = newSteps.splice(sourceIdx, 1);
            newSteps.splice(targetIdx, 0, movedStep);
            setFlow({ ...flow, steps: newSteps });
        }

        handleDragEnd(e);
    };

    // Helper: Encuentra campos vacíos para auto-link
    const findEmptyLinkFields = (step: FlowStep | null): Array<{ field: string; label: string }> => {
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
        const count = flow.steps.filter((s) => s.type === type).length + 1;
        const typeCode = type === "Question" ? "Q" : type === "Form" ? "F" : type === "Select" ? "S" : "E";

        let newId = `${prefix}-${typeCode}${count.toString().padStart(2, "0")}`;
        let i = 1;
        while (flow.steps.some((s) => s.id === newId)) {
            newId = `${prefix}-${typeCode}${(count + i).toString().padStart(2, "0")}`;
            i++;
        }

        let newStep: FlowStep;
        const baseProps = { id: newId, image: null, images: [] };

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

        if (autoLinkTo) {
            const { stepId, field } = autoLinkTo;
            const updatedSteps = newSteps.map((s) => {
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
            setSelectedStepId(newId);
        } else {
            setFlow({ ...flow, steps: newSteps });
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

    const handleDeleteStep = (stepId: string) => setConfirmation({ action: "delete", stepId });

    const handleUpdateStep = (stepId: string, updates: Partial<FlowStep>) => {
        const newSteps = flow.steps.map((s) => (s.id === stepId ? ({ ...s, ...updates } as FlowStep) : s));
        setFlow({ ...flow, steps: newSteps });

        if (updates.id && stepId === selectedStepId) {
            setSelectedStepId(updates.id);
        }
    };

    // -- Field Management (para Forms) --
    const handleAddField = (stepId: string, fieldType: "quantity" | "measurements" | "photo" | "notes") => {
        const step = flow.steps.find((s) => s.id === stepId) as FormStep;
        if (!step) return;

        const fieldConfig: Record<string, { type: "number" | "photo" | "text"; label: string; unit?: string; placeholder?: string }> = {
            quantity: { type: "number", label: "Quantity" },
            measurements: { type: "number", label: "Measurements", unit: "\"" },
            photo: { type: "photo", label: "Upload photo" },
            notes: { type: "text", label: "Notes (optional)", placeholder: "Enter notes..." }
        };

        if (fieldType !== "measurements" && step.fields.some((f) => f.id === fieldType)) {
            setFeedback({ open: true, type: "error", title: "Field already added", messages: [`This step already contains a ${fieldType} field.`] });
            return;
        }

        let fieldId: string = fieldType;
        if (fieldType === "measurements") {
            let idx = 1;
            while (step.fields.some((f) => f.id === `measurements_${idx}`)) {
                idx++;
            }
            fieldId = `measurements_${idx}`;
        }

        const config = fieldConfig[fieldType];
        const newField: FormField = {
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
        const step = flow.steps.find((s) => s.id === stepId) as FormStep;
        if (!step) return;
        const newFields = [...step.fields];
        newFields[fieldIndex] = { ...newFields[fieldIndex], ...updates };
        handleUpdateStep(stepId, { fields: newFields } as Partial<FormStep>);
    };

    const handleDeleteField = (stepId: string, fieldIndex: number) => {
        const step = flow.steps.find((s) => s.id === stepId) as FormStep;
        if (!step) return;
        const newFields = step.fields.filter((_, i) => i !== fieldIndex);
        handleUpdateStep(stepId, { fields: newFields } as Partial<FormStep>);
    };

    // -- Select Option Management --
    const handleAddOption = (stepId: string) => {
        const step = flow.steps.find((s) => s.id === stepId) as SelectStep;
        if (!step) return;
        handleUpdateStep(stepId, {
            options: [...step.options, { label: "New Option", next: "" }]
        } as Partial<SelectStep>);
    };

    const handleUpdateOption = (stepId: string, optionIndex: number, field: string, value: string) => {
        const step = flow.steps.find((s) => s.id === stepId) as SelectStep;
        if (!step) return;
        const newOptions = [...step.options];
        newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
        handleUpdateStep(stepId, { options: newOptions } as Partial<SelectStep>);
    };

    const handleDeleteOption = (stepId: string, optionIndex: number) => {
        const step = flow.steps.find((s) => s.id === stepId) as SelectStep;
        if (!step) return;
        const newOptions = step.options.filter((_, i) => i !== optionIndex);
        handleUpdateStep(stepId, { options: newOptions } as Partial<SelectStep>);
    };

    // -- Image Handling --
    const handleImageClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.multiple = true;
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !selectedStepId) return;

        const currentStep = flow.steps.find((s) => s.id === selectedStepId);
        if (!currentStep) return;

        const currentImages = currentStep.images || [];
        const newEntries: Array<[string, File]> = files.map((f) => [URL.createObjectURL(f), f]);

        setPendingUploads((prev) => {
            const existing = new Map(prev[selectedStepId] ?? []);
            newEntries.forEach(([blobUrl, file]) => existing.set(blobUrl, file));
            return { ...prev, [selectedStepId]: existing };
        });

        handleUpdateStep(selectedStepId, { images: [...currentImages, ...newEntries.map(([url]) => url)] });
    };

    const handleRemoveImage = (stepId: string, indexToRemove: number) => {
        const step = flow.steps.find((s) => s.id === stepId);
        if (!step) return;

        const currentImages = step.images || [];
        const urlToRemove = currentImages[indexToRemove];

        if (urlToRemove && urlToRemove.startsWith("blob:")) {
            URL.revokeObjectURL(urlToRemove);
            setPendingUploads((prev) => {
                const existing = new Map(prev[stepId] ?? []);
                existing.delete(urlToRemove);
                return { ...prev, [stepId]: existing };
            });
        }

        const newImages = currentImages.filter((_, i) => i !== indexToRemove);
        handleUpdateStep(stepId, { images: newImages });
    };

    // -- Save --
    const handleSave = async () => {
        if (isSaving || !isAdmin) return;
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

            const processUploadsByStep = async () => {
                for (const [stepId, blobToFileMap] of Object.entries(pendingUploads)) {
                    if (blobToFileMap.size === 0) continue;

                    const stepIndex = stepsCopy.findIndex((s) => s.id === stepId);
                    if (stepIndex === -1) continue;

                    const replacements = new Map<string, string>();
                    for (const [blobUrl, file] of blobToFileMap) {
                        const { uploadUrl, publicUrl } = await flowsRepo.getPresignedUrl(sanitizeFileName(file.name), file.type);
                        await flowsRepo.uploadFile(uploadUrl, file);
                        replacements.set(blobUrl, publicUrl);
                    }

                    const currentImages = stepsCopy[stepIndex].images || [];
                    const finalImages = currentImages.map((img) =>
                        img.startsWith("blob:") ? replacements.get(img) ?? img : img
                    );

                    stepsCopy[stepIndex] = { ...stepsCopy[stepIndex], images: finalImages };
                }
            };

            await processUploadsByStep();

            // Cálculo automático de shared quantity barriers
            const finalSteps = stepsCopy.map((step) => {
                if (step.type !== "Form") return step;

                const linkedBarriers = new Set<string>();

                stepsCopy.forEach((sourceStep) => {
                    if (sourceStep.type !== "Question") return;

                    const qStep = sourceStep as QuestionStep;
                    const conditionals = [qStep.conditionalYesNext, qStep.conditionalNoNext].filter(Boolean);

                    conditionals.forEach((condNav) => {
                        if (condNav!.next === step.id) {
                            if (qStep.barrierId) linkedBarriers.add(qStep.barrierId);

                            condNav!.conditions.forEach((condition) => {
                                const refStep = stepsCopy.find((s) => s.id === condition.step_id);
                                if (refStep) {
                                    if (refStep.type === "Select") {
                                        const option = (refStep as SelectStep).options.find(
                                            (o) => o.label === condition.selected_option
                                        );
                                        if (option?.barrierId) linkedBarriers.add(option.barrierId);
                                    } else if (refStep.type === "Question") {
                                        if ((refStep as QuestionStep).barrierId) {
                                            linkedBarriers.add((refStep as QuestionStep).barrierId!);
                                        }
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
            setLastSavedFlow(updatedFlow);
            setPendingUploads({});
            clearDraft();
            setIsSaving(false);

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
        setFeedback((prev) => ({ ...prev, open: false }));
        if (feedback.type === "success") {
            router.push("/flows");
        } else if (!flow.title.trim()) {
            requestAnimationFrame(() => titleInputRef.current?.focus());
        }
    };

    // Auto-link handlers
    const handleConfirmAutoLink = (targetField: string) => {
        if (!autoLinkModal || !selectedStep) return;

        const { newStepId } = autoLinkModal;

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

    const renderStepsPanel = (layout: "table" | "list") => (
        <FlowStepsTable
            flow={flow}
            layout={layout}
            selectedStepId={selectedStepId}
            onSelectStep={(id) => { setSelectedStepId(id); setStepsOpen(false); }}
            onDeleteStep={handleDeleteStep}
            onAddStep={handleAddStep}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isAdmin={isAdmin && !isSaving}
            draggedStepId={draggedStepId}
            dragOverStepId={dragOverStepId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            isStepIncomplete={isStepIncomplete}
        />
    );

    const titleMissing = !flow.title.trim() && feedback.messages.includes("Flow Title is required.");
    const inlineField = "min-w-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-[var(--kma-fg)] transition-colors placeholder:text-[var(--kma-muted)] hover:border-[var(--kma-border)] focus:border-[var(--kma-primary)] focus:bg-[var(--kma-surface)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-80";

    return (
        <div className="flex min-h-[650px] min-w-0 flex-col gap-3 xl:h-[calc(100dvh-205px)]" aria-busy={isSaving}>
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-3 px-1 py-1">
                <div className="min-w-0 flex-[1_1_20rem]">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Label htmlFor={`${metadataId}-title`} className="sr-only">Flow title</Label>
                        <Input
                            id={`${metadataId}-title`}
                            ref={titleInputRef}
                            value={flow.title}
                            aria-invalid={titleMissing}
                            aria-describedby={titleMissing ? `${metadataId}-error` : undefined}
                            onChange={(e) => setFlow({ ...flow, title: e.target.value })}
                            disabled={isSaving || !isAdmin}
                            placeholder="Untitled Flow"
                            aria-label="Flow title"
                            style={{ width: `${Math.min(Math.max(flow.title.length + 2, 14), 40)}ch`, minWidth: "min(100%, 20rem)" }}
                            className={`${inlineField} max-w-full !min-h-0 !w-auto !text-xl font-bold sm:!text-2xl`}
                        />
                        <span className="inline-flex items-center gap-1">
                            <span className="shrink-0 whitespace-nowrap text-sm font-medium text-[var(--kma-muted)]">
                                · {flow.steps.length} {flow.steps.length === 1 ? "node" : "nodes"}
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(true)}
                                title="How to create a flow"
                                aria-label="How to create a flow"
                                className="inline-flex h-[var(--kma-control-height)] w-[var(--kma-control-height)] shrink-0 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[var(--kma-subtle)] hover:text-[var(--kma-primary)]"
                            >
                                <Info className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </span>
                    </div>
                    <Label htmlFor={`${metadataId}-description`} className="sr-only">Flow description</Label>
                    <Input
                        id={`${metadataId}-description`}
                        value={flow.description ?? ""}
                        onChange={(e) => setFlow({ ...flow, description: e.target.value })}
                        disabled={isSaving || !isAdmin}
                        placeholder="Add a description (optional)..."
                        aria-label="Flow description"
                        className={`${inlineField} !min-h-0 w-full max-w-md !text-sm`}
                    />
                    {titleMissing ? <p id={`${metadataId}-error`} className="mt-1 text-sm text-[var(--kma-danger)]">Enter a title for this flow.</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {hasUnsavedChanges ? (
                        <>
                            <Badge tone="warning" role="status">Unsaved changes</Badge>
                            <Button type="button" variant="destructive" fullWidth={false} onClick={handleClearFlow} disabled={isSaving || !isAdmin} title={!isAdmin ? "Only administrators can discard changes" : "Discard changes and restore the saved flow"}>
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />Discard
                            </Button>
                        </>
                    ) : null}
                    <Button type="button" variant="secondary" fullWidth={false} onClick={handleExport} disabled={isSaving} title="Export flow as JSON">
                        <Download className="h-4 w-4" aria-hidden="true" />Export
                    </Button>
                    <Button type="button" fullWidth={false} onClick={handleSave} disabled={isSaving || !isAdmin} title={!isAdmin ? "Only administrators can save flows" : "Save Flow"}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                        <span>{isSaving ? "Saving..." : "Save Flow"}</span>
                    </Button>
                </div>
            </div>
            <div className="flex shrink-0 xl:hidden">
                <Button type="button" variant="secondary" fullWidth={false} onClick={() => setStepsOpen(true)} aria-expanded={stepsOpen} disabled={isSaving}><List className="h-4 w-4" aria-hidden="true" />Browse steps</Button>
            </div>
            <Modal open={stepsOpen} onOpenChange={setStepsOpen} className="justify-start p-0 sm:p-0">
                <ModalContent className="flex h-dvh max-h-dvh max-w-sm flex-col overflow-hidden rounded-none p-0 sm:p-0">
                    <ModalHeader className="mb-0 flex shrink-0 items-center justify-between border-b border-[var(--kma-border)] px-4 py-3">
                        <ModalTitle>Flow steps</ModalTitle>
                        <button type="button" onClick={() => setStepsOpen(false)} aria-label="Close steps" className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-[var(--kma-subtle)]"><X className="h-5 w-5" aria-hidden="true" /></button>
                    </ModalHeader>
                    {renderStepsPanel("list")}
                </ModalContent>
            </Modal>

            <div className="flex min-h-0 flex-1 gap-4">
                <div className="hidden min-w-0 flex-[3] flex-col xl:flex">
                    {renderStepsPanel("table")}
                </div>
                <div className="flex min-w-0 flex-1 flex-col xl:min-w-[340px] xl:max-w-[480px] xl:flex-[2]">
                    <StepDetailInspector
                        selectedStep={selectedStep}
                        flow={flow}
                        onUpdateStep={handleUpdateStep}
                        onDeleteStep={handleDeleteStep}
                        onAddStep={handleAddStep}
                        onAddField={handleAddField}
                        onUpdateField={handleUpdateField}
                        onDeleteField={handleDeleteField}
                        onAddOption={handleAddOption}
                        onUpdateOption={handleUpdateOption}
                        onDeleteOption={handleDeleteOption}
                        onImageClick={handleImageClick}
                        onRemoveImage={handleRemoveImage}
                        onZoomImage={setZoomedImage}
                        isAdmin={isAdmin && !isSaving}
                    />
                </div>
            </div>

            <ConfirmDialog
                open={confirmation !== null}
                onOpenChange={(open) => { if (!open) setConfirmation(null); }}
                title={confirmation?.action === "discard" ? "Discard changes?" : "Delete step?"}
                description={confirmation?.action === "discard" ? "Restore the saved flow and remove the local draft." : "References to this step will remain. Update any broken links before saving."}
                confirmLabel={confirmation?.action === "discard" ? "Discard changes" : "Delete step"}
                onConfirm={confirmAction}
                loading={isSaving}
            />

            {/* Feedback Modal */}
            <Modal open={feedback.open} onOpenChange={(open: boolean) => !open && handleCloseFeedback()}>
                <ModalContent className="max-w-md p-6">
                    <ModalHeader className="flex items-start gap-3">
                        {feedback.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--kma-success)]" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--kma-danger)]" aria-hidden="true" />}
                        <ModalTitle>{feedback.title}</ModalTitle>
                    </ModalHeader>
                    <ul className="space-y-3 text-sm leading-6 text-[var(--kma-muted)]">
                        {feedback.messages.map((message, index) => <li key={index} className={feedback.type === "error" ? "text-[var(--kma-danger)]" : undefined}>{message}</li>)}
                    </ul>

                    <ModalFooter className="mt-6">
                        <Button
                            onClick={handleCloseFeedback}
                            variant="primary"
                        >
                            {feedback.type === "success" ? "Continue" : "Fix Errors"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Auto-Link Modal */}
            <Modal open={autoLinkModal?.open ?? false} onOpenChange={(open: boolean) => !open && handleCancelAutoLink()}>
                <ModalContent className="max-w-md p-6">
                    <ModalHeader className="space-y-2">
                        <ModalTitle className="text-xl">Link New Step?</ModalTitle>
                        <ModalDescription className="text-sm text-[var(--kma-muted)]">
                            {autoLinkModal && selectedStep && (
                                <>
                                    Connect <span className="font-semibold text-[var(--kma-fg)]">{autoLinkModal.newStepId}</span> (
                                    {autoLinkModal.newStepType}) to{" "}
                                    <span className="font-semibold text-[var(--kma-fg)]">{selectedStep.id}</span>
                                </>
                            )}
                        </ModalDescription>
                    </ModalHeader>

                    <ModalFooter className="flex flex-col gap-2 mt-6">
                        {selectedStep?.type === "Question" &&
                            autoLinkModal?.availableFields.length === 2 &&
                            autoLinkModal.availableFields.some((f) => f.field === "yesNext") &&
                            autoLinkModal.availableFields.some((f) => f.field === "noNext") && (
                                <Button
                                    onClick={() => handleConfirmAutoLink("both")}
                                    className="justify-between"
                                >
                                    <span>Link to:</span>
                                    <span className="text-sm">
                                        Both (Yes & No)
                                    </span>
                                </Button>
                            )}

                        {autoLinkModal?.availableFields.map((fieldOption) => (
                            <Button
                                key={fieldOption.field}
                                onClick={() => handleConfirmAutoLink(fieldOption.field)}
                                className="justify-between"
                            >
                                <span>Link to:</span>
                                <span className="text-sm">
                                    {fieldOption.label}
                                </span>
                            </Button>
                        ))}
                        <Button onClick={handleCancelAutoLink} variant="secondary" className="mt-2">
                            Skip
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Help Modal */}
            <Modal open={showHelpModal} onOpenChange={setShowHelpModal}>
                <ModalContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                    <ModalHeader>
                        <ModalTitle>How to Create a Flow</ModalTitle>
                        <ModalDescription>Step-by-step guide to building audit flows</ModalDescription>
                    </ModalHeader>
                    <ol className="list-none space-y-6 text-sm leading-6 text-[var(--kma-fg)]">
                        <li>
                            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold"><span aria-hidden="true" className={HELP_NUMBER}>1</span>Set Flow Details</h3>
                            <p className="ml-8 text-[var(--kma-muted)]">Enter a title and description for your flow. This helps identify the purpose of the audit.</p>
                        </li>
                        <li>
                            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold"><span aria-hidden="true" className={HELP_NUMBER}>2</span>Create Steps (The Workflow)</h3>
                            <div className="ml-8 space-y-3">
                                <p>A Flow is a sequence of steps. You typically start with a <strong>Select</strong> or a <strong>Question</strong>.</p>
                                <div className="rounded-lg border border-[var(--kma-success-border)] bg-[var(--kma-success-bg)] p-3">
                                    <p className="mb-1 flex items-center gap-1 text-sm font-medium text-[var(--kma-success)]"><Zap className="h-4 w-4" aria-hidden="true" />Efficient Way: Inline Create</p>
                                    <p>
                                        Instead of creating steps one-by-one, just use the <span className="rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-1 text-xs font-medium">+ Create</span> button beside any &quot;Next Step&quot; selector and choose a step type. This creates and links the new step in one go.
                                    </p>
                                </div>
                            </div>
                        </li>
                        <li>
                            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold"><span aria-hidden="true" className={HELP_NUMBER}>3</span>Step Types</h3>
                            <ul className="ml-8 space-y-2">
                                <li className="flex items-start gap-2"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kma-primary)]" aria-hidden="true" /><span><span className="font-medium">Question:</span> Yes/No branching to verify conditions.</span></li>
                                <li className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kma-success)]" aria-hidden="true" /><span><span className="font-medium">Form:</span> The destination for data collection (measurements, photos, notes).</span></li>
                                <li className="flex items-start gap-2"><List className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kma-info)]" aria-hidden="true" /><span><span className="font-medium">Select:</span> A menu of categorical options with distinct branches.</span></li>
                                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kma-muted)]" aria-hidden="true" /><span><span className="font-medium">End:</span> Terminates the flow immediately.</span></li>
                            </ul>
                        </li>
                        <li>
                            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold"><span aria-hidden="true" className={HELP_NUMBER}>4</span>Visual Checks</h3>
                            <p className="ml-8 flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kma-warning)]" aria-hidden="true" /><span><span className="font-medium text-[var(--kma-warning)]">Incomplete Step:</span> Means a &quot;Next Step&quot; is missing. You must fill all links before saving.</span></p>
                        </li>
                        <li>
                            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold"><span aria-hidden="true" className={HELP_NUMBER}>5</span>Advanced: Double Dipping &amp; Shared Forms</h3>
                            <div className="ml-8 space-y-3">
                                <p><strong>&quot;Double Dipping&quot;</strong> allows you to reuse a single Form step for multiple different barriers or scenarios. This is powerful for grouping findings.</p>
                                <div className="space-y-2 rounded-lg border border-[var(--kma-info-border)] bg-[var(--kma-info-bg)] p-3">
                                    <p className="text-xs font-semibold uppercase text-[var(--kma-info)]">How to setup Double Dipping:</p>
                                    <ol className="ml-1 list-inside list-decimal space-y-1">
                                        <li>Create a single <strong>Form</strong> step (e.g. &quot;Record Barrier Quantity&quot;).</li>
                                        <li>Create your <strong>Questions</strong> (e.g. &quot;Is the door too heavy?&quot;, &quot;Is the knob accessible?&quot;).</li>
                                        <li>Set the <strong>Barrier ID</strong> on each Question to their respective barrier code.</li>
                                        <li>Point the failing branch of both Questions to the <strong>same Form step</strong>.</li>
                                    </ol>
                                </div>
                                <p className="flex items-start gap-2 pt-1 text-xs text-[var(--kma-muted)]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--kma-info)]" aria-hidden="true" /><span><strong>Auto-Calculation:</strong> When you save, the system automatically detects all the &quot;Double Dippings&quot; and calculates the &quot;Shared Quantity&quot; logic for you. You do not need to manually assign Barrier IDs to the Form.</span></p>
                            </div>
                        </li>
                    </ol>
                    <ModalFooter className="mt-6 justify-center border-t border-[var(--kma-border)] pt-4"><Button fullWidth={false} onClick={() => setShowHelpModal(false)}>Got it!</Button></ModalFooter>
                </ModalContent>
            </Modal>

            {/* Draft Recovery Modal */}
            <Modal open={showDraftRecoveryModal} onOpenChange={setShowDraftRecoveryModal}>
                <ModalContent className="max-w-md p-6">
                    <ModalHeader className="space-y-2">
                        <ModalTitle className="text-xl">Draft found</ModalTitle>
                        <ModalDescription className="text-sm text-[var(--kma-muted)]">
                            A locally saved draft is available. Recover your changes or discard the draft.
                        </ModalDescription>
                    </ModalHeader>

                    <ModalFooter className="flex flex-col gap-2 mt-6">
                        <Button onClick={handleRecoverDraft} variant="primary">
                            Recover draft
                        </Button>
                        <Button onClick={handleDiscardDraft} variant="secondary">
                            Discard draft
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Zoomed Image Modal */}
            <Modal open={!!zoomedImage} onOpenChange={(open: boolean) => !open && setZoomedImage(null)}>
                <ModalContent className="max-w-4xl p-2">
                    <ModalHeader className="sr-only">
                        <ModalTitle>View Image</ModalTitle>
                    </ModalHeader>
                    {zoomedImage && (
                        <div className="relative flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={zoomedImage}
                                alt="Zoomed View"
                                className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
                            />
                            <button
                                type="button"
                                onClick={() => setZoomedImage(null)}
                                aria-label="Close image"
                                className="absolute right-2 top-2 z-50 inline-flex h-11 w-11 items-center justify-center rounded bg-[var(--kma-surface)] text-[var(--kma-fg)] shadow-lg transition-colors hover:bg-[var(--kma-subtle)]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </ModalContent>
            </Modal>

            {/* Input oculto para carga de imágenes */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
            />
        </div>
    );
};
