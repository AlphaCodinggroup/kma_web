"use client";

import { cn } from "@shared/lib/cn";
import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-sm font-medium text-black mb-1", className)}
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
          "w-full rounded-xl bg-gray-100 text-black placeholder:text-gray-500",
          "ring-1 ring-inset ring-gray-300",
          "focus:outline-none focus:bg-gray-200 focus:ring-2 focus:ring-gray-400",
          "px-3 py-2 text-sm",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          error && "ring-red-400 focus:ring-red-500",
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
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-controls={id}
              aria-pressed={visible}
              onClick={toggle}
              className="focus:ring-gray-400"
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

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center w-full rounded-xl cursor-pointer",
        "bg-black text-white",
        "px-4 py-2 text-sm font-medium",
        "hover:opacity-50",
        "focus:outline-none focus:ring-2 focus:ring-gray-400",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  )
);
Button.displayName = "Button";

export const HelpText: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => <p className={cn("mt-1 text-xs text-gray-600", className)} {...props} />;

export const ErrorText: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => (
  <p className={cn("mt-2 text-sm text-red-600", className)} {...props} />
);
