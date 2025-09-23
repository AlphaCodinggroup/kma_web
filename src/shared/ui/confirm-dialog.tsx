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
  ModalCloseButton,
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
}) => {
  const disabled = loading === true;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={cn(className)}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          {description ? (
            <ModalDescription>{description}</ModalDescription>
          ) : null}
        </ModalHeader>

        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : (
          <div className="mt-2" />
        )}

        <ModalFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
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
            className={cn("bg-red-600 hover:opacity-50 rounded-xl")}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmDialog;
