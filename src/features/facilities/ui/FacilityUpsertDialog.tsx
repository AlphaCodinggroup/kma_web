"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@shared/lib/cn";
import {
  Label,
  Input,
  Button,
  ErrorText,
  HelpText,
  Textarea,
} from "@shared/ui/controls";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
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
  descriptionOverride: _descriptionOverride,
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
    [defaultValues],
  );

  const [values, setValues] = useState<FacilityUpsertValues>(initial);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initial.photoUrl || null,
  );
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "address" | "city", string>>>({});

  useEffect(() => {
    if (open) {
      setValues(initial);
      setFieldErrors({});
      setPhotoPreview(initial.photoUrl || null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    }
  // Los errores de guardado no deben reiniciar los campos ni el archivo elegido.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleChange = useCallback(
    <K extends keyof FacilityUpsertValues>(
      key: K,
      val: FacilityUpsertValues[K],
    ) => {
      setValues((s) => ({ ...s, [key]: val }));
      if (key === "name" || key === "address" || key === "city") setFieldErrors(errors => ({ ...errors, [key]: undefined }));
    },
    [],
  );

  const onSubmitInternal = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading || submittingRef.current) return;

      const trimmedName = values.name.trim();
      const trimmedAddress = values.address?.trim();
      const trimmedCity = values.city?.trim();
      const trimmedDescription = values.description?.trim();
      const trimmedPhotoUrl = values.photoUrl?.trim();

      // Al editar, un campo vaciado se envía como cadena vacía para que el
      // backend lo borre; descartarlo hacía imposible limpiarlo. Al crear no
      // hay nada que borrar, así que los vacíos se omiten.
      const keepEmpty = mode === "edit";
      const optional = (value: string | undefined) =>
        value || (keepEmpty && value !== undefined) ? value : undefined;

      const payload: FacilityUpsertValues = {
        name: trimmedName,
        ...(optional(trimmedAddress) !== undefined
          ? { address: trimmedAddress }
          : {}),
        ...(optional(trimmedCity) !== undefined ? { city: trimmedCity } : {}),
        ...(optional(trimmedDescription) !== undefined
          ? { description: trimmedDescription }
          : {}),
        ...(values.photoFile ? { photoFile: values.photoFile } : {}),
        ...(mode === "create" &&
        trimmedPhotoUrl &&
        !values.photoFile &&
        !values.clearPhoto
          ? { photoUrl: trimmedPhotoUrl }
          : {}),
        ...(values.clearPhoto && !values.photoFile ? { clearPhoto: true } : {}),
      };

      const errors: Partial<Record<"name" | "address" | "city", string>> = {};
      if (!trimmedName) errors.name = "Name is required.";
      if (mode === "create" && !trimmedAddress) errors.address = "Address is required.";
      if (mode === "create" && !trimmedCity) errors.city = "City, State is required.";
      setFieldErrors(errors);
      const firstError = (Object.keys(errors) as (keyof typeof errors)[])[0];
      if (firstError) {
        e.currentTarget.querySelector<HTMLElement>(`#facility-${firstError}`)?.focus();
        return;
      }
      submittingRef.current = true;
      try { await onSubmit(payload); }
      finally { submittingRef.current = false; }
    },
    [mode, onSubmit, values, loading],
  );

  const isSubmitting = loading === true;
  const disableSubmit = isSubmitting;

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
    [handleChange, values.photoUrl],
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
    submit:
      submitLabelOverride ??
      (mode === "create" ? "Create Facility" : "Update Facility"),
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        className={cn("max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto", className)}
      >
        <ModalCloseButton onClick={() => onOpenChange(false)} />

        <ModalHeader>
          <ModalTitle>{copy.title}</ModalTitle>
        </ModalHeader>

        <form noValidate onSubmit={onSubmitInternal} className="grid gap-x-6 gap-y-5 border-t border-[var(--kma-border)] pt-5 sm:grid-cols-2 [&_input]:min-h-11">
          {/* Facility Name */}
          <div className="sm:col-span-2">
            <Label htmlFor="facility-name">Name</Label>
            <Input
              id="facility-name"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "facility-name-error" : undefined}
              placeholder={
                mode === "create" ? "Enter facility name" : "Facility name"
              }
              value={values.name}
              onChange={(e) => handleChange("name", e.currentTarget.value)}
              disabled={isSubmitting}
              required
            />
            {fieldErrors.name ? <ErrorText id="facility-name-error" role="alert">{fieldErrors.name}</ErrorText> : null}
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="facility-address">Address</Label>
            <Input
              id="facility-address"
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={fieldErrors.address ? "facility-address-error" : undefined}
              placeholder="Enter facility address"
              value={values.address ?? ""}
              onChange={(e) => handleChange("address", e.currentTarget.value)}
              disabled={isSubmitting}
              required
            />
            {fieldErrors.address ? <ErrorText id="facility-address-error" role="alert">{fieldErrors.address}</ErrorText> : null}
          </div>

          {/* City, State */}
          <div>
            <Label htmlFor="facility-city">City, State</Label>
            <Input
              id="facility-city"
              aria-invalid={Boolean(fieldErrors.city)}
              aria-describedby={fieldErrors.city ? "facility-city-error" : undefined}
              placeholder="Enter city, state"
              value={values.city ?? ""}
              onChange={(e) => handleChange("city", e.currentTarget.value)}
              disabled={isSubmitting}
              required
            />
            {fieldErrors.city ? <ErrorText id="facility-city-error" role="alert">{fieldErrors.city}</ErrorText> : null}
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <Label htmlFor="facility-description">Description</Label>
            <Textarea
              id="facility-description"
              placeholder="Enter description"
              value={values.description ?? ""}
              onChange={(e) =>
                handleChange("description", e.currentTarget.value)
              }
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          {/* Photo upload */}
          <div className="sm:col-span-2 border-y border-[var(--kma-border)] py-5">
            <Label htmlFor="facility-photo">Photo</Label>
            <Input
              ref={fileInputRef}
              className="sr-only"
              id="facility-photo"
              type="file"
              accept="image/*"
              onChange={(e) =>
                handlePhotoChange(e.currentTarget.files?.[0] ?? null)
              }
              disabled={isSubmitting}
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" fullWidth={false} onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>Choose photo</Button>
              <span className="min-w-0 break-words text-sm text-[var(--kma-muted)]">{values.photoFile?.name ?? (photoPreview ? "Current photo" : "No photo selected")}</span>
            </div>
            {photoPreview ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={photoPreview}
                  alt="Facility photo preview"
                  className="h-24 w-32 rounded object-cover border border-[var(--kma-border)]"
                />
                <div className="w-fit">
                  <Button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isSubmitting}
                    variant="ghost" fullWidth={false} className="px-3 text-sm"
                    style={{ width: "auto" }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="sm:col-span-2">{error ? <ErrorText>{error}</ErrorText> : <HelpText>&nbsp;</HelpText>}</div>

          <ModalFooter className="border-t border-[var(--kma-border)] pt-4 sm:col-span-2">
            <Button
              type="submit"
              fullWidth={false}
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
