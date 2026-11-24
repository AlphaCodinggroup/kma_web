"use client";

import React from "react";
import type {
  CreateFlowCategoryInput,
  FlowCategory,
  UpdateFlowCategoryInput,
} from "@entities/flow/model";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@shared/ui/modal";
import { Button, Input, Label, Textarea } from "@shared/ui/controls";
import { Loader2, X } from "lucide-react";

export interface FlowCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categoría a editar; si se omite, el diálogo funciona en modo creación. */
  category?: FlowCategory | null | undefined;
  isSubmitting?: boolean | undefined;
  error?: string | null | undefined;
  onSubmit: (
    values: CreateFlowCategoryInput | UpdateFlowCategoryInput
  ) => Promise<void> | void;
}

export const FlowCategoryDialog: React.FC<FlowCategoryDialogProps> = ({
  open,
  onOpenChange,
  category,
  isSubmitting = false,
  error,
  onSubmit,
}) => {
  const isEditing = Boolean(category);
  const fieldId = React.useId();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setIsActive(category?.isActive ?? true);
    setValidationError(null);
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Category name is required.");
      return;
    }
    setValidationError(null);
    await onSubmit({
      name: trimmedName,
      description: description.trim(),
      isActive,
    });
  };

  const displayError = validationError ?? error;

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <ModalContent className="max-w-md p-6">
        <ModalHeader className="flex items-start justify-between gap-3">
          <div>
            <ModalTitle>
              {isEditing ? "Edit category" : "Create category"}
            </ModalTitle>
            <ModalDescription className="mt-1">
              {isEditing
                ? "Update the category details used to organize audit flows."
                : "Add a new category to organize your audit flows."}
            </ModalDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[var(--kma-subtle)] hover:text-[var(--kma-fg)] disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <Label htmlFor={`${fieldId}-name`}>Name</Label>
            <Input
              id={`${fieldId}-name`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. Accessible Routes"
              disabled={isSubmitting}
              error={Boolean(validationError)}
              required
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor={`${fieldId}-description`}>Description</Label>
            <Textarea
              id={`${fieldId}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional summary of flows in this category"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--kma-fg)]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-[var(--kma-border)] accent-[var(--kma-primary)]"
            />
            <span>Active category (available when editing flows)</span>
          </label>

          {displayError ? (
            <p role="alert" className="text-sm text-[var(--kma-danger)]">
              {displayError}
            </p>
          ) : null}

          <ModalFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth={false}
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" fullWidth={false} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Create category"
              )}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default FlowCategoryDialog;
