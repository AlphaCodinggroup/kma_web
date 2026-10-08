"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Label, Input, Button, ErrorText, HelpText } from "@shared/ui/controls";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
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
  descriptionOverride: _descriptionOverride,
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
  const submittingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setPendingAuditorId("");
      setPendingFacilityId("");
      setNameTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Removed 'initial' to prevent reset when adding items during edit

  const handleChange = useCallback(
    <K extends keyof ProjectUpsertValues>(
      key: K,
      val: ProjectUpsertValues[K]
    ) => setValues((s) => ({ ...s, [key]: val })),
    []
  );

  const addAuditor = useCallback((id: string) => {
    if (!id) return;
    setValues((s) => {
      const prev = s.auditorIds ?? [];
      if (prev.includes(id)) return s;
      return { ...s, auditorIds: [...prev, id] };
    });
    setPendingAuditorId("");
  }, []);

  const addFacility = useCallback((id: string) => {
    if (!id) return;
    setValues((s) => {
      const prev = s.facilityIds ?? [];
      if (prev.includes(id)) return s;
      return { ...s, facilityIds: [...prev, id] };
    });
    setPendingFacilityId("");
  }, []);

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

  const hasPendingSelection = false; // No longer needed with auto-add

  const pendingSelectionError = null; // No longer needed with auto-add

  const onSubmitInternal = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading || submittingRef.current) return;

      // Bloqueo extra por seguridad
      if (hasPendingSelection) {
        return;
      }

      const trimmedNameLocal = values.name.trim();
      if (!trimmedNameLocal) {
        setNameTouched(true);
        e.currentTarget.querySelector<HTMLElement>("#project-name")?.focus();
        return;
      }

      const trimmedDescription = values.description?.trim();

      const payload: ProjectUpsertValues = {
        name: trimmedNameLocal,
        facilityIds: values.facilityIds ?? [],
        auditorIds: values.auditorIds ?? [],
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      };

      submittingRef.current = true;
      try { await onSubmit(payload); }
      finally { submittingRef.current = false; }
    },
    [onSubmit, values, hasPendingSelection, loading]
  );

  const isFormControlsDisabled = loading === true;
  const isSubmitDisabled =
    loading === true || hasPendingSelection;

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
    submit:
      submitLabelOverride ??
      (mode === "create" ? "Create Project" : "Update Project"),
  };

  const globalError = pendingSelectionError ?? error ?? null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={cn("max-w-2xl", className)}>
        <ModalCloseButton onClick={() => onOpenChange(false)} />

        <ModalHeader>
          <ModalTitle>{copy.title}</ModalTitle>
        </ModalHeader>

        <form onSubmit={onSubmitInternal} className="grid gap-x-6 gap-y-5 border-t border-[var(--kma-border)] pt-5 sm:grid-cols-2 [&_input]:min-h-11">
          {/* Project Name */}
          <div className="border-b border-[var(--kma-border)] pb-5 sm:col-span-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              aria-invalid={showNameError}
              aria-describedby={showNameError ? "project-name-error" : undefined}
              placeholder={
                mode === "create" ? "Enter project name" : "Project name"
              }
              value={values.name}
              onChange={(e) => {
                if (!nameTouched) setNameTouched(true);
                handleChange("name", e.currentTarget.value);
              }}
              onBlur={() => setNameTouched(true)}
              disabled={isFormControlsDisabled}
            />
            {showNameError && (
              <p id="project-name-error" role="alert" className="mt-1 text-sm text-[var(--kma-danger)]">
                Project name is required.
              </p>
            )}
          </div>

          {/* Assigned Auditors (multi) */}
          <div>
            <Label>Assigned Auditors</Label>

            <div className="relative">
              <select
                className={cn(
                  "w-full appearance-none rounded",
                  "bg-[var(--kma-input)] text-[var(--kma-input-fg)]",
                  "border border-[var(--kma-input-border)] min-h-11 px-3 pr-9",
                  "outline-none transition focus:bg-[var(--kma-input-focus)]",
                  "focus:ring-2 focus:ring-[var(--kma-primary)]"
                )}
                value={pendingAuditorId}
                onChange={(e) => {
                  const selectedId = e.currentTarget.value;
                  if (selectedId) {
                    addAuditor(selectedId);
                  }
                }}
                disabled={isFormControlsDisabled}
                aria-label="Select an auditor to add"
              >
                <option value="">Select an auditor</option>
                {auditors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name?.trim() || a.email || a.id}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--kma-muted)]" />
            </div>

            {values.auditorIds && values.auditorIds.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {values.auditorIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded bg-[var(--kma-subtle)] px-3 py-1 text-sm text-[var(--kma-fg)] ring-1 ring-[var(--kma-border)]"
                  >
                    {auditorNameById.get(id) ?? id}
                    <button
                      type="button"
                      onClick={() => removeAuditor(id)}
                      className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-subtle)]"
                      aria-label={`Remove ${auditorNameById.get(id) ?? id}`}
                      disabled={isFormControlsDisabled}
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

            <div className="relative">
              <select
                className={cn(
                  "w-full appearance-none rounded",
                  "bg-[var(--kma-input)] text-[var(--kma-input-fg)]",
                  "border border-[var(--kma-input-border)] min-h-11 px-3 pr-9",
                  "outline-none transition focus:bg-[var(--kma-input-focus)]",
                  "focus:ring-2 focus:ring-[var(--kma-primary)]"
                )}
                value={pendingFacilityId}
                onChange={(e) => {
                  const selectedId = e.currentTarget.value;
                  if (selectedId) {
                    addFacility(selectedId);
                  }
                }}
                disabled={isFormControlsDisabled}
                aria-label="Select a facility to add"
              >
                <option value="">Select a facility</option>
                {facilities.map((f, i) => (
                  <option key={i} value={f.id}>
                    {f.name || f.id}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--kma-muted)]" />
            </div>


            {values.facilityIds && values.facilityIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {values.facilityIds.map((id, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 rounded bg-[var(--kma-subtle)] px-3 py-1 text-sm text-[var(--kma-fg)] ring-1 ring-[var(--kma-border)]"
                  >
                    {facilityNameById.get(id) ?? id}
                    <button
                      type="button"
                      onClick={() => removeFacility(id)}
                      className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-subtle)]"
                      aria-label={`Remove ${facilityNameById.get(id) ?? id}`}
                      disabled={isFormControlsDisabled}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">{globalError ? <ErrorText>{globalError}</ErrorText> : <HelpText>&nbsp;</HelpText>}</div>

          <ModalFooter className="border-t border-[var(--kma-border)] pt-4 sm:col-span-2">
            <Button
              type="submit"
              fullWidth={false}
              isLoading={loading === true}
              disabled={isSubmitDisabled}
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
