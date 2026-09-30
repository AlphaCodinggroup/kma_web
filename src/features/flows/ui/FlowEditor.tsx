"use client";

import React from "react";
import type { Flow, FormStep, QuestionStep, SelectStep, FlowStep, FormField } from "@entities/flow/model";
import { Button } from "@shared/ui/controls";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@shared/ui/modal";
import {
    Save,
    RotateCcw,
    Loader2,
    Download,
    Info,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    HelpCircle,
    FileText,
    List,
    AlertTriangle,
    History,
    X
} from "lucide-react";
import { flowsRepo } from "@features/flows/api/flows.repo.impl";
import { cn } from "@shared/lib/cn";
import { sanitizeFileName } from "@shared/lib/file";
import { useRouter } from "next/navigation";
import { Loading } from "@shared/ui/Loading";
import { useQueryClient } from "@tanstack/react-query";
import { flowsKeys } from "@features/flows/lib/useFlowsQuery";
import { useSession } from "@processes/auth/hooks";
import { FlowStepsTable } from "./FlowStepsTable";
import { StepDetailInspector } from "./StepDetailInspector";

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
    const { isAdmin } = useSession();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
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
            setShowDraftRecoveryModal(false);
            setRecoveredDraft(null);
        }
    };

    const handleDiscardDraft = () => {
        clearDraft();
        setShowDraftRecoveryModal(false);
        setRecoveredDraft(null);
    };

    const handleClearFlow = () => {
        if (confirm("¿Está seguro que desea descartar todos los cambios y volver al estado inicial? Esta acción no se puede deshacer.")) {
            setFlow(initialFlow);
            clearDraft();
            setSelectedStepId(initialFlow.steps[0]?.id || null);
        }
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

    if (isSaving) {
        return <Loading text="Saving..." />;
    }

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

    const handleDeleteStep = (stepId: string) => {
        if (confirm("Are you sure you want to delete this step? References to it will strictly safely be kept but broken.")) {
            const newSteps = flow.steps.filter((s) => s.id !== stepId);
            setFlow({ ...flow, steps: newSteps });
            if (selectedStepId === stepId) {
                setSelectedStepId(newSteps[0]?.id || null);
            }
        }
    };

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
            alert(`${fieldType} is already added`);
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

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-3">
            {/* Top Bar / Header conforme al mockup */}
            <div className="flex items-center justify-between gap-4 px-1 py-1">
                {/* Título & contador de nodos & descripción */}
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <input
                                value={flow.title}
                                onChange={(e) => setFlow({ ...flow, title: e.target.value })}
                                className="text-xl sm:text-2xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:bg-white rounded px-1.5 py-0.5 text-gray-900 transition-all focus:outline-none truncate"
                                placeholder="Untitled Flow"
                            />
                            <span className="text-sm font-medium text-gray-400 whitespace-nowrap">
                                · {flow.steps.length} {flow.steps.length === 1 ? "node" : "nodes"}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowHelpModal(true)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                            title="How to create a flow"
                        >
                            <Info className="h-4 w-4" />
                        </button>
                    </div>
                    <input
                        value={flow.description ?? ""}
                        onChange={(e) => setFlow({ ...flow, description: e.target.value })}
                        className="text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:bg-white rounded px-1.5 py-0.5 max-w-md placeholder:text-gray-400 transition-all focus:outline-none"
                        placeholder="Add a description (optional)..."
                    />
                </div>

                {/* Acciones principales: Discard, Export, Save Flow */}
                <div className="flex items-center gap-2 shrink-0">
                    {hasUnsavedChanges && (
                        <>
                            <span className="hidden md:inline-flex text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                Unsaved changes
                            </span>
                            <button
                                type="button"
                                onClick={handleClearFlow}
                                className="inline-flex items-center h-9 px-3 gap-1.5 text-xs font-semibold bg-white text-red-600 hover:bg-red-50 border border-red-200 rounded-lg shadow-xs transition-colors whitespace-nowrap disabled:opacity-50"
                                disabled={isSaving || !isAdmin}
                                title={!isAdmin ? "Only administrators can discard changes" : "Descartar cambios y volver al estado inicial"}
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Discard</span>
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex items-center h-9 px-3.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 border border-gray-300 rounded-lg shadow-xs transition-colors gap-1.5 whitespace-nowrap"
                        title="Export flow as JSON"
                    >
                        <Download className="h-3.5 w-3.5 text-gray-500" />
                        <span>Export</span>
                    </button>

                    <button
                        type="button"
                        className={cn(
                            "inline-flex items-center h-9 px-4 text-xs font-semibold bg-black text-white hover:bg-gray-800 rounded-lg shadow-sm transition-all disabled:opacity-50 gap-1.5 whitespace-nowrap",
                            isSaving ? "opacity-80" : ""
                        )}
                        onClick={handleSave}
                        disabled={isSaving || !isAdmin}
                        title={!isAdmin ? "Only administrators can save flows" : "Save Flow"}
                    >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        <span>{isSaving ? "Saving..." : "Save Flow"}</span>
                    </button>
                </div>
            </div>

            {/* Layout Principal: Master (Tabla de Pasos 60-65%) y Detail (Inspector de Paso 35-40%) */}
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Panel Izquierdo: Tabla Panorámica de Flujo */}
                <div className="flex-[3] min-w-0 flex flex-col h-full">
                    <FlowStepsTable
                        flow={flow}
                        selectedStepId={selectedStepId}
                        onSelectStep={setSelectedStepId}
                        onDeleteStep={handleDeleteStep}
                        onAddStep={handleAddStep}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        isAdmin={isAdmin}
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
                </div>

                {/* Panel Derecho: Inspector de Paso Seleccionado */}
                <div className="flex-[2] min-w-[340px] max-w-[480px] flex flex-col h-full">
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
                        isAdmin={isAdmin}
                    />
                </div>
            </div>

            {/* Feedback Modal */}
            <Modal open={feedback.open} onOpenChange={(open: boolean) => !open && handleCloseFeedback()}>
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
                            <div
                                key={i}
                                className={cn(
                                    "text-sm p-2 rounded-md flex items-start gap-2",
                                    feedback.type === "error" ? "bg-red-50 text-red-800" : "text-gray-600 text-center justify-center"
                                )}
                            >
                                {feedback.type === "error" && <span className="opacity-70">•</span>}
                                {msg}
                            </div>
                        ))}
                    </div>

                    <ModalFooter className="justify-center mt-6">
                        <Button
                            onClick={handleCloseFeedback}
                            className={cn("w-full", feedback.type === "error" ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-gray-800")}
                        >
                            {feedback.type === "success" ? "Continue" : "Fix Errors"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Auto-Link Modal */}
            <Modal open={autoLinkModal?.open ?? false} onOpenChange={(open: boolean) => !open && handleCancelAutoLink()}>
                <ModalContent className="max-w-md p-6">
                    <ModalHeader className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 rounded-full bg-blue-100">
                            <ArrowRight className="w-8 h-8 text-blue-600" />
                        </div>
                        <ModalTitle className="text-xl text-blue-700">Link New Step?</ModalTitle>
                        <ModalDescription className="text-sm text-gray-600">
                            {autoLinkModal && selectedStep && (
                                <>
                                    Connect <span className="font-semibold text-gray-900">{autoLinkModal.newStepId}</span> (
                                    {autoLinkModal.newStepType}) to{" "}
                                    <span className="font-semibold text-gray-900">{selectedStep.id}</span>
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
                                    className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-between"
                                >
                                    <span>Link to:</span>
                                    <span className="font-mono text-sm bg-green-700/50 px-2 py-0.5 rounded">
                                        Both (Yes & No)
                                    </span>
                                </Button>
                            )}

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
                        <ModalTitle className="text-2xl text-blue-700">How to Create a Flow</ModalTitle>
                        <ModalDescription className="text-sm text-gray-600">
                            Step-by-step guide to building audit flows
                        </ModalDescription>
                    </ModalHeader>

                    <div className="space-y-6 mt-6">
                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                                    1
                                </span>
                                Set Flow Details
                            </h3>
                            <p className="text-sm text-gray-600 ml-8">
                                Enter a title and description for your flow. This helps identify the purpose of the audit.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                                    2
                                </span>
                                Create Steps (The Workflow)
                            </h3>
                            <div className="ml-8 space-y-3">
                                <p className="text-sm text-gray-700">
                                    A Flow is a sequence of steps. You typically start with a <strong>Select</strong> or a{" "}
                                    <strong>Question</strong>.
                                </p>
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="font-medium text-sm text-green-800 mb-1 flex items-center gap-1">
                                        <span className="text-lg">⚡</span> Efficient Way: Inline Create
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Instead of creating steps one-by-one, just click the green{" "}
                                        <span className="font-mono bg-emerald-600 text-white px-1 rounded text-xs">+ Create</span>{" "}
                                        button inside any &quot;Next Step&quot; selector. This creates and links the new step in one go.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                                    3
                                </span>
                                Step Types
                            </h3>
                            <div className="ml-8 space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                                    <div>
                                        <span className="font-medium">Question:</span> Yes/No branching to verify conditions.
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <FileText className="h-4 w-4 text-green-500 mt-0.5" />
                                    <div>
                                        <span className="font-medium">Form:</span> The destination for data collection (measurements, photos, notes).
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <List className="h-4 w-4 text-purple-500 mt-0.5" />
                                    <div>
                                        <span className="font-medium">Select:</span> A menu of categorical options with distinct branches.
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
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                                    4
                                </span>
                                Visual Checks
                            </h3>
                            <div className="ml-8 space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                    <div>
                                        <span className="font-medium text-amber-700">Incomplete Step:</span> Means a &quot;Next Step&quot; is missing. You must fill all links before saving.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                                    5
                                </span>
                                Advanced: Double Dipping &amp; Shared Forms
                            </h3>
                            <div className="ml-8 space-y-3 text-sm">
                                <p className="text-gray-700">
                                    <strong>&quot;Double Dipping&quot;</strong> allows you to reuse a single Form step for multiple different barriers or scenarios. This is powerful for grouping findings.
                                </p>

                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                                    <p className="font-semibold text-purple-900 text-xs uppercase">How to setup Double Dipping:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-1">
                                        <li>Create a single <strong>Form</strong> step (e.g. &quot;Record Barrier Quantity&quot;).</li>
                                        <li>Create your <strong>Questions</strong> (e.g. &quot;Is the door too heavy?&quot;, &quot;Is the knob accessible?&quot;).</li>
                                        <li>Set the <strong>Barrier ID</strong> on each Question to their respective barrier code.</li>
                                        <li>Point the failing branch of both Questions to the <strong>same Form step</strong>.</li>
                                    </ol>
                                </div>

                                <div className="flex items-start gap-2 pt-1">
                                    <Info className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                    <div className="text-gray-600 text-xs">
                                        <strong>Auto-Calculation:</strong> When you save, the system automatically detects all the &quot;Double Dippings&quot; and calculates the &quot;Shared Quantity&quot; logic for you. You do not need to manually assign Barrier IDs to the Form.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ModalFooter className="justify-center mt-6 pt-4 border-t">
                        <Button onClick={() => setShowHelpModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Got it!
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Draft Recovery Modal */}
            <Modal open={showDraftRecoveryModal} onOpenChange={setShowDraftRecoveryModal}>
                <ModalContent className="max-w-md p-6">
                    <ModalHeader className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 rounded-full bg-amber-100">
                            <History className="w-8 h-8 text-amber-600" />
                        </div>
                        <ModalTitle className="text-xl text-amber-700">Borrador encontrado</ModalTitle>
                        <ModalDescription className="text-sm text-gray-600">
                            Se encontró un borrador guardado automáticamente de una sesión anterior. ¿Desea recuperarlo o descartarlo?
                        </ModalDescription>
                    </ModalHeader>

                    <ModalFooter className="flex flex-col gap-2 mt-6">
                        <Button onClick={handleRecoverDraft} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                            Recuperar borrador
                        </Button>
                        <Button onClick={handleDiscardDraft} className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300">
                            Descartar y empezar limpio
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Zoomed Image Modal */}
            <Modal open={!!zoomedImage} onOpenChange={(open: boolean) => !open && setZoomedImage(null)}>
                <ModalContent className="max-w-4xl p-2 bg-black/5 border-none shadow-none">
                    <ModalHeader className="sr-only">
                        <ModalTitle>View Image</ModalTitle>
                    </ModalHeader>
                    {zoomedImage && (
                        <div className="relative flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={zoomedImage}
                                alt="Zoomed View"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                            <button
                                onClick={() => setZoomedImage(null)}
                                className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-50"
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
