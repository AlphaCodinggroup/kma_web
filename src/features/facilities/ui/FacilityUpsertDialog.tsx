"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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

export type FacilityUpsertMode = "create" | "edit";

export type FacilityUpsertValues = {
  name: string;
  address?: string | undefined;
  city?: string | undefined;
  notes?: string | undefined;
};

export interface FacilityUpsertDialogProps {
  mode: FacilityUpsertMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FacilityUpsertValues> | undefined;
  onSubmit: (values: FacilityUpsertValues) => void | Promise<void>;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  titleOverride?: string | undefined;
  descriptionOverride?: string | undefined;
  submitLabelOverride?: string | undefined;
  className?: string | undefined;
}

/**
 * Modal reutilizable para Crear/Editar una Facility.
 */
const FacilityUpsertDialog: React.FC<FacilityUpsertDialogProps> = ({
  mode,
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  loading,
  error,
  titleOverride,
  descriptionOverride,
  submitLabelOverride,
  className,
}) => {
  const initial: FacilityUpsertValues = useMemo(
    () => ({
      name: defaultValues?.name ?? "",
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      notes: defaultValues?.notes ?? "",
    }),
    [defaultValues]
  );

  const [values, setValues] = useState<FacilityUpsertValues>(initial);

  useEffect(() => {
    if (open) {
      setValues(initial);
    }
  }, [open, initial]);

  const handleChange = useCallback(
    <K extends keyof FacilityUpsertValues>(
      key: K,
      val: FacilityUpsertValues[K]
    ) =>
      setValues((s) => ({
        ...s,
        [key]: val,
      })),
    []
  );

  const onSubmitInternal = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = values.name.trim();
      const trimmedAddress = values.address?.trim();
      const trimmedCity = values.city?.trim();
      const trimmedNotes = values.notes?.trim();

      const payload: FacilityUpsertValues = {
        name: trimmedName,
        ...(trimmedAddress ? { address: trimmedAddress } : {}),
        ...(trimmedCity ? { city: trimmedCity } : {}),
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      };

      await onSubmit(payload);
    },
    [onSubmit, values]
  );

  const disabled = loading === true;

  const copy = {
    title:
      titleOverride ??
      (mode === "create" ? "Create New Facility" : "Edit Facility"),
    description:
      descriptionOverride ??
      (mode === "create"
        ? "Add a new facility location to the system"
        : "Update facility information"),
    submit:
      submitLabelOverride ??
      (mode === "create" ? "Create Facility" : "Update Facility"),
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
          {/* Facility Name */}
          <div>
            <Label htmlFor="facility-name">Facility Name</Label>
            <Input
              id="facility-name"
              placeholder={
                mode === "create" ? "Enter facility name" : "Facility name"
              }
              value={values.name}
              onChange={(e) => handleChange("name", e.currentTarget.value)}
              disabled={disabled}
              required
            />
            <HelpText>
              Required – this identifies the facility in the system.
            </HelpText>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="facility-address">Address</Label>
            <Input
              id="facility-address"
              placeholder="Enter facility address (optional)"
              value={values.address ?? ""}
              onChange={(e) => handleChange("address", e.currentTarget.value)}
              disabled={disabled}
            />
          </div>

          {/* City */}
          <div>
            <Label htmlFor="facility-city">City</Label>
            <Input
              id="facility-city"
              placeholder="Enter city (optional)"
              value={values.city ?? ""}
              onChange={(e) => handleChange("city", e.currentTarget.value)}
              disabled={disabled}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="facility-notes">Notes</Label>
            <Input
              id="facility-notes"
              placeholder="Enter notes (optional)"
              value={values.notes ?? ""}
              onChange={(e) => handleChange("notes", e.currentTarget.value)}
              disabled={disabled}
            />
            <HelpText>
              Internal notes or a short description of this facility (optional).
            </HelpText>
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

export default FacilityUpsertDialog;
