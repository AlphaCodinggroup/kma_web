"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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

export type UpsertMode = "create" | "edit";

export type ProjectUpsertValues = {
  name: string;
  auditorId?: string | undefined;
  buildingId?: string | undefined;
};

export type Option = { id: string; name: string };

export interface ProjectUpsertDialogProps {
  mode: UpsertMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<ProjectUpsertValues> | undefined;
  auditors: Option[];
  buildings: Option[];
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
  buildings,
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
      auditorId: defaultValues?.auditorId,
      buildingId: defaultValues?.buildingId,
    }),
    [defaultValues]
  );

  const [values, setValues] = useState<ProjectUpsertValues>(initial);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  const handleChange = <K extends keyof ProjectUpsertValues>(
    key: K,
    val: ProjectUpsertValues[K]
  ) => setValues((s) => ({ ...s, [key]: val }));

  const disabled = loading === true;

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

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(values);
          }}
          className="space-y-5"
        >
          {/* Project Name */}
          <div>
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder={
                mode === "create" ? "Enter project name" : "Project name"
              }
              value={values.name}
              onChange={(e) => handleChange("name", e.currentTarget.value)}
              disabled={disabled}
              required
            />
          </div>

          {/* Assigned Auditor */}
          <div>
            <Label>Assigned Auditor</Label>
            <div className="relative">
              <select
                className={cn(
                  "w-full appearance-none rounded-xl",
                  "bg-[var(--kma-input)] text-[var(--kma-input-fg)]",
                  "border border-[var(--kma-input-border)] h-10 px-3 pr-9",
                  "outline-none transition focus:bg-[var(--kma-input-focus)]",
                  "focus:ring-2 focus:ring-[color:oklch(0_0_0_/_0.2)]"
                )}
                value={values.auditorId ?? ""}
                onChange={(e) =>
                  handleChange("auditorId", e.currentTarget.value || undefined)
                }
                disabled={disabled}
                aria-label="Select an auditor"
              >
                <option value="">
                  {mode === "create"
                    ? "Select an auditor"
                    : "Select an auditor"}
                </option>
                {auditors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            </div>
          </div>

          {/* Building */}
          <div>
            <Label>Building</Label>
            <div className="relative">
              <select
                className={cn(
                  "w-full appearance-none rounded-xl",
                  "bg-[var(--kma-input)] text-[var(--kma-input-fg)]",
                  "border border-[var(--kma-input-border)] h-10 px-3 pr-9",
                  "outline-none transition focus:bg-[var(--kma-input-focus)]",
                  "focus:ring-2 focus:ring-[color:oklch(0_0_0_/_0.2)]"
                )}
                value={values.buildingId ?? ""}
                onChange={(e) =>
                  handleChange("buildingId", e.currentTarget.value || undefined)
                }
                disabled={disabled}
                aria-label="Select a building"
              >
                <option value="">
                  {mode === "create"
                    ? "Select a building"
                    : "Select a building"}
                </option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            </div>
          </div>

          {error ? <ErrorText>{error}</ErrorText> : <HelpText>&nbsp;</HelpText>}

          <ModalFooter>
            <Button type="submit" isLoading={disabled} disabled={disabled}>
              {copy.submit}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ProjectUpsertDialog;
