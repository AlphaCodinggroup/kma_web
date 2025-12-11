"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Label, Input, Textarea, Button, ErrorText } from "@shared/ui/controls";
import { useUpdateAuditFindingMutation } from "../lib/hooks/useUpdateAuditFindingMutation";
import type { UpdateAuditFindingInput } from "@entities/audit/model/audit-review-finding-update";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalCloseButton,
} from "@shared/ui/modal";

export interface AuditFindingEditFormValues {
  quantity: number | null;
  notes: string | null;
}

export interface AuditFindingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  questionCode?: string | null;
  defaultValues?: Partial<AuditFindingEditFormValues>;
  title?: string;
}

const AuditFindingEditDialog: React.FC<AuditFindingEditDialogProps> = ({
  open,
  onOpenChange,
  auditId,
  questionCode,
  defaultValues,
  title = "Edit finding",
}) => {
  const initialValues = useMemo(
    () => ({
      quantity:
        typeof defaultValues?.quantity === "number" &&
        Number.isFinite(defaultValues.quantity)
          ? String(defaultValues.quantity)
          : "",
      notes: defaultValues?.notes ?? "",
    }),
    [defaultValues]
  );

  const [quantity, setQuantity] = useState<string>(initialValues.quantity);
  const [notes, setNotes] = useState<string>(initialValues.notes);
  const [localError, setLocalError] = useState<string | null>(null);
  const {
    mutateAsync: updateFinding,
    isPending,
    reset: resetMutation,
    error: mutationError,
  } = useUpdateAuditFindingMutation();

  useEffect(() => {
    if (open) {
      setQuantity(initialValues.quantity);
      setNotes(initialValues.notes);
      setLocalError(null);
      resetMutation();
    }
  }, [open, initialValues, resetMutation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!auditId || !questionCode) {
      setLocalError("Missing auditId or questionCode.");
      return;
    }

    const qtyStr = quantity.trim();
    const notesStr = notes.trim();

    let parsedQuantity: number | null = null;
    if (qtyStr !== "") {
      const asNumber = Number(qtyStr);
      if (!Number.isFinite(asNumber)) {
        setLocalError("Quantity must be a valid number.");
        return;
      }
      parsedQuantity = asNumber;
    }

    try {
      const payload: UpdateAuditFindingInput = {
        auditId,
        questionCode,
      };

      if (qtyStr !== "") {
        payload.quantity = parsedQuantity;
      }

      payload.notes = notesStr === "" ? null : notesStr;

      await updateFinding(payload);
      onOpenChange(false);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to update finding"
      );
    }
  };

  const isSubmitting = isPending;
  const displayError = localError ?? mutationError?.message ?? null;
  const hasChanges =
    quantity !== initialValues.quantity || notes !== initialValues.notes;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <ModalCloseButton onClick={() => onOpenChange(false)} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <ModalHeader className="space-y-2">
            <ModalTitle>{title}</ModalTitle>
            <ModalDescription>
              Adjust the quantity and notes for the selected finding.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="finding-quantity">Quantity</Label>
              <Input
                id="finding-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.currentTarget.value)}
                min="0"
                step="1"
                placeholder="e.g. 25"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="finding-notes">Notes</Label>
              <Textarea
                id="finding-notes"
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                rows={4}
                placeholder="Finding notes"
                disabled={isSubmitting}
              />
            </div>

            {displayError ? <ErrorText>{displayError}</ErrorText> : null}
          </div>

          <ModalFooter>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-auto px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting || !hasChanges}
              className="w-auto px-4"
            >
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AuditFindingEditDialog;
