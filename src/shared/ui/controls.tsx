"use client";

import { cn } from "@shared/lib/cn";
import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-sm font-medium text-[var(--kma-fg)] mb-1", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
type PasswordToggleRenderArgs = {
  visible: boolean;
  toggle: () => void;
  inputId?: string;
};

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  withPasswordToggle?: boolean;
  renderToggle?: (args: PasswordToggleRenderArgs) => React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, error, withPasswordToggle, renderToggle, type, id, ...props },
    ref
  ) => {
    const [visible, setVisible] = React.useState(false);
    const isPassword = type === "password" && withPasswordToggle;
    const toggle = React.useCallback(() => setVisible((v) => !v), []);
    const inputType = isPassword ? (visible ? "text" : "password") : type;

    const inputEl = (
      <input
        ref={ref}
        id={id}
        type={inputType}
        className={cn(
          "kma-field w-full rounded bg-[var(--kma-surface)] text-[var(--kma-fg)] placeholder:text-[var(--kma-muted)] ",
          "border border-[var(--kma-border)] ",
          "focus:outline-none focus:bg-[var(--kma-surface)] focus:ring-2 focus:ring-[var(--kma-primary)] ",
          "min-h-11 px-3 py-2 text-base sm:min-h-10 sm:text-sm",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          error && "border-[var(--kma-danger)] focus:ring-[var(--kma-danger)]",
          isPassword && "pr-10",
          className
        )}
        {...props}
      />
    );

    if (!isPassword) return inputEl;

    return (
      <div className="relative">
        {inputEl}
        <div className="absolute inset-y-0 right-2 flex items-center">
          {renderToggle ? (
            renderToggle({ visible, toggle, inputId: id ?? "" })
          ) : (
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-controls={id}
              aria-pressed={visible}
              onClick={toggle}
              className="inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] hover:text-[var(--kma-fg)] focus:ring-[var(--kma-primary)]"
            >
              {visible ? (
                <EyeOff size={18} aria-hidden />
              ) : (
                <Eye size={18} aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        // base visual: gris claro, texto negro
        "kma-field w-full rounded bg-[var(--kma-surface)] text-[var(--kma-fg)] placeholder:text-[var(--kma-muted)] ",
        // bordes/ring sutil
        "border border-[var(--kma-border)] ",
        // foco: un gris apenas más oscuro + ring más notorio
        "focus:outline-none focus:bg-[var(--kma-surface)] focus:ring-2 focus:ring-[var(--kma-primary)] ",
        // tamaño/espaciado
        "min-h-11 px-3 py-2 text-base sm:min-h-10 sm:text-sm",
        // disabled
        "disabled:opacity-60 disabled:cursor-not-allowed",
        // error
        error && "border-[var(--kma-danger)] focus:ring-[var(--kma-danger)]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";


export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: React.ReactNode | undefined;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  fullWidth?: boolean;
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      isLoading,
      loadingLabel,
      disabled,
      children,
      variant = "primary",
      fullWidth = true,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        "kma-control-button",
        `kma-button-${variant}`,
        fullWidth && "w-full",
        "focus:outline-none focus:ring-2 focus:ring-[var(--kma-primary)] ",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
      {isLoading ? loadingLabel ?? children : children}
    </button>
  )
);
Button.displayName = "Button";

export const HelpText: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => <p className={cn("mt-1 text-xs text-[var(--kma-muted)] ", className)} {...props} />;

export const ErrorText: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p className={cn("mt-2 text-sm text-[var(--kma-danger)]", className)} {...props} />
);
