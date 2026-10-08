"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/controls";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  } from "@shared/ui/modal";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode | undefined;
  onConfirm?: () => void | Promise<void>;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  className?: string | undefined;
  variant?: "primary" | "destructive";
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
  error,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  className,
  variant = "destructive",
}) => {
  const disabled = loading === true;

  return (
    <Modal open={open} onOpenChange={onOpenChange} closeOnEsc={!disabled} closeOnOverlay={!disabled}>
      <ModalContent className={cn("max-w-md", className)}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          {description ? (
            <ModalDescription>{description}</ModalDescription>
          ) : null}
        </ModalHeader>

        {error ? (
          <p role="alert" className="mt-2 text-sm text-[var(--kma-danger)]">{error}</p>
        ) : (
          <div className="mt-2" />
        )}

        <ModalFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
            variant="secondary"
            fullWidth={false}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            onClick={async () => {
              if (disabled) return;
              await onConfirm?.();
            }}
            disabled={disabled}
            isLoading={disabled}
            variant={variant}
            fullWidth={false}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmDialog;
