"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Label, Input, Button, ErrorText, HelpText } from "@shared/ui/controls";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalCloseButton,
} from "@shared/ui/modal";
import type { UserSummary } from "@entities/user/list.model";

export type UpsertMode = "create" | "edit";

export type ProjectUpsertValues = {
  name: string;
  description?: string | undefined;
  auditorIds?: string[] | undefined;
  facilityIds?: string[] | undefined;
};

export type Option = { id: string; name: string };

export interface ProjectUpsertDialogProps {
  mode: UpsertMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<ProjectUpsertValues> | undefined;
  auditors: UserSummary[];
  facilities: Option[];
  onSubmit: (values: ProjectUpsertValues) => void | Promise<void>;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  titleOverride?: string | undefined;
  descriptionOverride?: string | undefined;
  submitLabelOverride?: string | undefined;

  className?: string | undefined;
}

/**
 * Modal reutilizable para Crear/Editar un proyecto.
 * Cambia textos automáticamente según `mode`.
 */
const ProjectUpsertDialog: React.FC<ProjectUpsertDialogProps> = ({
  mode,
  open,
  onOpenChange,
  defaultValues,
  auditors,
  facilities,
  onSubmit,
  loading,
  error,
  titleOverride,
  descriptionOverride,
  submitLabelOverride,
  className,
}) => {
  const initial: ProjectUpsertValues = useMemo(
    () => ({
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      auditorIds: defaultValues?.auditorIds ?? [],
      facilityIds: defaultValues?.facilityIds ?? [],
    }),
    [defaultValues]
  );

  const [values, setValues] = useState<ProjectUpsertValues>(initial);
  const [pendingAuditorId, setPendingAuditorId] = useState<string>("");
  const [pendingFacilityId, setPendingFacilityId] = useState<string>("");
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setPendingAuditorId("");
      setPendingFacilityId("");
      setNameTouched(false);
    }
  }, [open, initial]);

  const handleChange = useCallback(
    <K extends keyof ProjectUpsertValues>(
      key: K,
      val: ProjectUpsertValues[K]
    ) => setValues((s) => ({ ...s, [key]: val })),
    []
  );

  const addAuditor = useCallback(() => {
    const id = pendingAuditorId.trim();
    if (!id) return;
    setValues((s) => {
      const prev = s.auditorIds ?? [];
      if (prev.includes(id)) return s;
      return { ...s, auditorIds: [...prev, id] };
    });
    setPendingAuditorId("");
  }, [pendingAuditorId]);

  const addFacility = useCallback(() => {
    const id = pendingFacilityId.trim();
    if (!id) return;
    setValues((s) => {
      const prev = s.facilityIds ?? [];
      if (prev.includes(id)) return s;
      return { ...s, facilityIds: [...prev, id] };
    });
    setPendingFacilityId("");
  }, [pendingFacilityId]);

  const removeAuditor = useCallback((id: string) => {
    setValues((s) => ({
      ...s,
      auditorIds: (s.auditorIds ?? []).filter((x) => x !== id),
    }));
  }, []);

  const removeFacility = useCallback((id: string) => {
    setValues((s) => ({
      ...s,
      facilityIds: (s.facilityIds ?? []).filter((x) => x !== id),
    }));
  }, []);

  const trimmedName = values.name.trim();
  const isNameInvalid = trimmedName.length === 0;
  const showNameError = nameTouched && isNameInvalid;

  const onSubmitInternal = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedNameLocal = values.name.trim();
      if (!trimmedNameLocal) {
        setNameTouched(true);
        return;
      }

      const trimmedDescription = values.description?.trim();

      const payload: ProjectUpsertValues = {
        name: trimmedNameLocal,
        facilityIds: values.facilityIds ?? [],
        auditorIds: values.auditorIds ?? [],
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      };

      await onSubmit(payload);
    },
    [onSubmit, values]
  );

  const disabled = loading === true || isNameInvalid;

  // Index de opciones para mostrar labels en chips (user.name/email/id)
  const auditorNameById = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const a of auditors) {
      const label = a.name?.trim() || a.email || a.id;
      map.set(a.id, label);
    }
    return map;
  }, [auditors]);

  const facilityNameById = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const f of facilities) map.set(f.id, f.name || f.id);
    return map;
  }, [facilities]);

  const copy = {
    title:
      titleOverride ??
      (mode === "create" ? "Create New Project" : "Edit Project"),
    description:
      descriptionOverride ??
      (mode === "create"
        ? "Add a new audit project to the system"
        : "Update project information"),
    submit:
      submitLabelOverride ??
      (mode === "create" ? "Create Project" : "Update Project"),
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={cn(className)}>
        <ModalCloseButton onClick={() => onOpenChange(false)} />

        <ModalHeader>
          <ModalTitle>{copy.title}</ModalTitle>
          <ModalDescription>{copy.description}</ModalDescription>
        </ModalHeader>

        <form onSubmit={onSubmitInternal} className="space-y-5">
          {/* Project Name */}
          <div>
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder={
                mode === "create" ? "Enter project name" : "Project name"
              }
              value={values.name}
              onChange={(e) => {
                if (!nameTouched) setNameTouched(true);
                handleChange("name", e.currentTarget.value);
              }}
              onBlur={() => setNameTouched(true)}
              disabled={loading === true}
            />
            {showNameError && (
              <p className="mt-1 text-sm text-red-500">
                Project name is required.
              </p>
            )}
          </div>

          {/* Project Description (opcional) */}
          <div>
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              placeholder="Enter a short description (optional)"
              value={values.description ?? ""}
              onChange={(e) =>
                handleChange("description", e.currentTarget.value)
              }
              disabled={disabled}
            />
          </div>

          {/* Assigned Auditors (multi) */}
          <div>
            <Label>Assigned Auditors</Label>

            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              {/* Select ocupa todo */}
              <div className="relative">
                <select
                  className={cn(
                    "w-full appearance-none rounded-xl",
                    "bg-[var(--kma-input)] text-[var(--kma-input-fg)]",
                    "border border-[var(--kma-input-border)] h-10 px-3 pr-9",
                    "outline-none transition focus:bg-[var(--kma-input-focus)]",
                    "focus:ring-2 focus:ring-[color:oklch(0_0_0_/_0.2)]"
                  )}
                  value={pendingAuditorId}
                  onChange={(e) => setPendingAuditorId(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAuditor();
                    }
                  }}
                  disabled={disabled}
                  aria-label="Select an auditor to add"
                >
                  <option value="">Select an auditor</option>
                  {auditors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name?.trim() || a.email || a.id}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              </div>

              {/* Botón chico a la derecha */}
              <Button
                type="button"
                aria-label="Add auditor"
                onClick={addAuditor}
                disabled={disabled || !pendingAuditorId}
                className="h-10 w-10 p-0 rounded-xl shrink-0"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* chips */}
            {values.auditorIds && values.auditorIds.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {values.auditorIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800 ring-1 ring-gray-200"
                  >
                    {auditorNameById.get(id) ?? id}
                    <button
                      type="button"
                      onClick={() => removeAuditor(id)}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200"
                      aria-label={`Remove ${auditorNameById.get(id) ?? id}`}
                      disabled={disabled}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Facilities (multi) */}
          <div>
            <Label>Facilities</Label>

            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="relative">
                <select
                  className={cn(
                    "w-full appearance-none rounded-xl",
                    "bg-[var(--kma-input)] text-[var(--kma-input-fg)]",
                    "border border-[var(--kma-input-border)] h-10 px-3 pr-9",
                    "outline-none transition focus:bg-[var(--kma-input-focus)]",
                    "focus:ring-2 focus:ring-[color:oklch(0_0_0_/_0.2)]"
                  )}
                  value={pendingFacilityId}
                  onChange={(e) => setPendingFacilityId(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFacility();
                    }
                  }}
                  disabled={disabled}
                  aria-label="Select a facility to add"
                >
                  <option value="">Select a facility</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name || f.id}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              </div>

              <Button
                type="button"
                aria-label="Add facility"
                onClick={addFacility}
                disabled={disabled || !pendingFacilityId}
                className="h-10 w-10 p-0 rounded-xl shrink-0"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {values.facilityIds && values.facilityIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {values.facilityIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800 ring-1 ring-gray-200"
                  >
                    {facilityNameById.get(id) ?? id}
                    <button
                      type="button"
                      onClick={() => removeFacility(id)}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200"
                      aria-label={`Remove ${facilityNameById.get(id) ?? id}`}
                      disabled={disabled}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error ? <ErrorText>{error}</ErrorText> : <HelpText>&nbsp;</HelpText>}

          <ModalFooter>
            <Button
              type="submit"
              isLoading={loading === true}
              disabled={disabled}
            >
              {copy.submit}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ProjectUpsertDialog;
