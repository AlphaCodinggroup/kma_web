"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  description?: string | undefined;
  photoUrl?: string | undefined;
  photoFile?: File | null;
  clearPhoto?: boolean;
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
      description: defaultValues?.description ?? "",
      photoUrl: defaultValues?.photoUrl ?? "",
      photoFile: null,
      clearPhoto: false,
    }),
    [defaultValues]
  );

  const [values, setValues] = useState<FacilityUpsertValues>(initial);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initial.photoUrl || null
  );
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setPhotoPreview(initial.photoUrl || null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
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
      const trimmedDescription = values.description?.trim();
      const trimmedPhotoUrl = values.photoUrl?.trim();

      const payload: FacilityUpsertValues = {
        name: trimmedName,
        ...(trimmedAddress ? { address: trimmedAddress } : {}),
        ...(trimmedCity ? { city: trimmedCity } : {}),
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
        ...(values.photoFile ? { photoFile: values.photoFile } : {}),
        ...(trimmedPhotoUrl && !values.photoFile && !values.clearPhoto
          ? { photoUrl: trimmedPhotoUrl }
          : {}),
        ...(values.clearPhoto && !values.photoFile ? { clearPhoto: true } : {}),
      };

      await onSubmit(payload);
    },
    [onSubmit, values]
  );

  const isSubmitting = loading === true;
  const isNameValid = values.name.trim().length > 0;
  const disableSubmit = isSubmitting || !isNameValid;

  const handlePhotoChange = useCallback(
    (file: File | null) => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      if (file) {
        const preview = URL.createObjectURL(file);
        objectUrlRef.current = preview;
        setPhotoPreview(preview);
        handleChange("photoFile", file);
        handleChange("photoUrl", "");
        handleChange("clearPhoto", false);
      } else {
        setPhotoPreview(values.photoUrl?.trim() || null);
        handleChange("photoFile", null);
        handleChange("clearPhoto", false);
      }
    },
    [handleChange, values.photoUrl]
  );

  const handleRemovePhoto = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPhotoPreview(null);
    setValues((s) => ({
      ...s,
      photoFile: null,
      photoUrl: "",
      clearPhoto: true,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

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
              disabled={isSubmitting}
              required
            />
            {isNameValid ? (
              <HelpText>
                Required - this identifies the facility in the system.
              </HelpText>
            ) : (
              <ErrorText>Facility name is required</ErrorText>
            )}
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="facility-address">Address</Label>
            <Input
              id="facility-address"
              placeholder="Enter facility address (optional)"
              value={values.address ?? ""}
              onChange={(e) => handleChange("address", e.currentTarget.value)}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="facility-description">Description</Label>
            <Input
              id="facility-description"
              placeholder="Enter description (optional)"
              value={values.description ?? ""}
              onChange={(e) => handleChange("description", e.currentTarget.value)}
              disabled={isSubmitting}
            />
            <HelpText>
              Short description of this facility (optional).
            </HelpText>
          </div>

          {/* Photo upload */}
          <div>
            <Label htmlFor="facility-photo">Photo</Label>
            <Input
              id="facility-photo"
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.currentTarget.files?.[0] ?? null)}
              disabled={isSubmitting}
            />
            {photoPreview ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={photoPreview}
                  alt="Facility photo preview"
                  className="h-20 w-28 rounded-md object-cover border"
                />
                <div className="w-fit">
                  <Button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isSubmitting}
                    className="w-auto px-3 py-1 text-sm"
                    style={{ width: "auto" }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <HelpText>Optional image.</HelpText>
            )}
          </div>

          {error ? <ErrorText>{error}</ErrorText> : <HelpText>&nbsp;</HelpText>}

          <ModalFooter>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={disableSubmit}
            >
              {copy.submit}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default FacilityUpsertDialog;
