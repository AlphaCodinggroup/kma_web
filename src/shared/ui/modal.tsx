"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@shared/lib/cn";

const ModalContext = React.createContext<{ setDescriptionId: React.Dispatch<React.SetStateAction<string | undefined>> } | null>(null);

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnOverlay?: boolean;
  className?: string | undefined;
}

export function Modal({ open, onOpenChange, children, closeOnEsc = true, closeOnOverlay = true, className }: ModalProps) {
  const opener = React.useRef<HTMLElement | null>(null);
  const [descriptionId, setDescriptionId] = React.useState<string>();
  const context = React.useMemo(() => ({ setDescriptionId }), []);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <ModalContext.Provider value={context}>
        <Dialog.Portal>
          <Dialog.Overlay onClick={() => { if (closeOnOverlay) onOpenChange(false); }} data-testid="modal-overlay" className="fixed inset-0 z-50 bg-[var(--kma-overlay)] backdrop-blur-[2px]" />
          <Dialog.Content
            aria-modal="true"
            aria-describedby={descriptionId}
            style={{ pointerEvents: "none" }}
            className={cn("kma-modal-position fixed inset-0 z-50 outline-none [&>*]:pointer-events-auto", className)}
            onOpenAutoFocus={(event) => {
              opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
              const content = event.target;
              if (!(content instanceof HTMLElement)) return;
              const isMobile = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
              const target = content.querySelector<HTMLElement>(isMobile ? "h2" : "input:not([type='hidden']):not(:disabled), select:not(:disabled), textarea:not(:disabled)") ?? content.querySelector<HTMLElement>("h2");
              if (target) {
                event.preventDefault();
                if (!target.matches("input,select,textarea")) target.tabIndex = -1;
                target.focus({ preventScroll: true });
              }
            }}
            onCloseAutoFocus={(event) => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); }}
            onEscapeKeyDown={(event) => { if (!closeOnEsc) event.preventDefault(); }}
            onPointerDownOutside={(event) => { if (!closeOnOverlay) event.preventDefault(); }}
            onInteractOutside={(event) => { if (!closeOnOverlay) event.preventDefault(); }}
          >
            <div style={{ display: "contents", pointerEvents: "auto" }}>{children}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </ModalContext.Provider>
    </Dialog.Root>
  );
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string | undefined;
}
export function ModalContent({ children, className }: ModalContentProps) {
  return <div className={cn("card kma-modal-panel relative pointer-events-auto w-full overflow-y-auto", className)}>{children}</div>;
}

export const ModalHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => <div className={cn("mb-5", className)} {...props} />;
export const ModalTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => {
  const inside = React.useContext(ModalContext);
  const title = <h2 className={cn("text-xl font-bold tracking-tight pr-7", className)} {...props} />;
  return inside ? <Dialog.Title asChild>{title}</Dialog.Title> : title;
};
export const ModalDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => {
  const inside = React.useContext(ModalContext);
  const generatedId = React.useId();
  const id = props.id ?? generatedId;
  React.useEffect(() => {
    if (!inside) return;
    inside.setDescriptionId(id);
    return () => inside.setDescriptionId(current => current === id ? undefined : current);
  }, [inside, id]);
  const description = <p className={cn("mt-1 text-[var(--kma-muted)] text-sm leading-relaxed", className)} {...props} id={id} />;
  return inside ? <Dialog.Description asChild>{description}</Dialog.Description> : description;
};
export const ModalFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => <div className={cn("mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--kma-border)] pt-5", className)} {...props} />;

export interface ModalCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
export function ModalCloseButton({ className, ...props }: ModalCloseButtonProps) {
  return <button type="button" aria-label="Close" className={cn("absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-subtle)]", className)} {...props}><X className="h-5 w-5" aria-hidden="true" /></button>;
}
