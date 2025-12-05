"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/cn";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnOverlay?: boolean;
  className?: string | undefined;
}

export function Modal({
  open,
  onOpenChange,
  children,
  closeOnEsc = true,
  closeOnOverlay = true,
}: ModalProps) {
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onOpenChange]);

  if (!open) return null;

  return (
    <div aria-modal="true" role="dialog" className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={closeOnOverlay ? () => onOpenChange(false) : undefined}
      />
      {/* Content portal */}
      <div className="absolute inset-0 grid place-items-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string | undefined;
}

export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <div
      className={cn(
        "card relative w-full max-w-2xl bg-white text-black rounded-2xl",
        "border border-[var(--kma-border)] shadow-lg p-6 sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export const ModalHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn("mb-5", className)} {...props} />;

export const ModalTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h2
    className={cn(
      "text-2xl sm:text-[28px] font-semibold tracking-tight",
      className
    )}
    {...props}
  />
);

export const ModalDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p className={cn("mt-1 text-gray-600", className)} {...props} />
);

export const ModalFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "mt-6 sm:mt-8 flex items-center justify-end gap-3",
      className
    )}
    {...props}
  />
);

export interface ModalCloseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
export function ModalCloseButton({
  className,
  ...props
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      aria-label="Close"
      className={cn(
        "absolute right-4 top-4 inline-flex h-9 w-9",
        "items-center justify-center cursor-pointer bg-white",
        className
      )}
      {...props}
    >
      <X className="h-5 w-5" />
    </button>
  );
}
