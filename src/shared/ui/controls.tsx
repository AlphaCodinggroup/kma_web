"use client";

import { cn } from "@shared/lib/cn";
import * as React from "react";

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

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // base visual: gris claro, texto negro
        "w-full rounded-xl bg-gray-100 text-black placeholder:text-gray-500",
        // bordes/ring sutil
        "ring-1 ring-inset ring-gray-300",
        // foco: un gris apenas más oscuro + ring más notorio
        "focus:outline-none focus:bg-gray-200 focus:ring-2 focus:ring-gray-400",
        // tamaño/espaciado
        "px-3 py-2 text-sm",
        // disabled
        "disabled:opacity-60 disabled:cursor-not-allowed",
        // error
        error && "ring-red-400 focus:ring-red-500",
        className
      )}
      {...props}
    />
  )
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
        "w-full rounded-xl bg-gray-100 text-black placeholder:text-gray-500",
        // bordes/ring sutil
        "ring-1 ring-inset ring-gray-300",
        // foco: un gris apenas más oscuro + ring más notorio
        "focus:outline-none focus:bg-gray-200 focus:ring-2 focus:ring-gray-400",
        // tamaño/espaciado
        "px-3 py-2 text-sm",
        // disabled
        "disabled:opacity-60 disabled:cursor-not-allowed",
        // error
        error && "ring-red-400 focus:ring-red-500",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";


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
