"use client";

import React from "react";
import { cn } from "@shared/lib/cn";

export type RowActionVariant = "default" | "danger";
export type RowActionSize = "sm" | "md";

export interface RowActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel: string;
  variant?: RowActionVariant;
  size?: RowActionSize;
  "data-testid"?: string;
  className?: string;
}

const RowActionButton: React.FC<RowActionButtonProps> = ({
  icon: Icon,
  ariaLabel,
  variant = "default",
  size = "md",
  className,
  disabled,
  ...props
}) => {
  const sizeCls = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-lg";

  const variantCls =
    variant === "danger"
      ? [
          "bg-white text-red-600",
          "hover:bg-red-50",
          "focus-visible:ring-2 focus-visible:ring-black/30",
          "border border-[var(--kma-border)]",
        ].join(" ")
      : [
          "bg-white text-black",
          "hover:bg-gray-100",
          "focus-visible:ring-2 focus-visible:ring-black/30",
          "border border-[var(--kma-border)]",
        ].join(" ");

  const disabledCls = disabled
    ? "opacity-60 cursor-not-allowed hover:bg-white"
    : "";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        sizeCls,
        variantCls,
        disabledCls,
        className
      )}
      disabled={disabled}
      {...props}
    >
      <Icon className={cn(size === "sm" ? "h-4 w-4" : "h-4 w-4")} />
    </button>
  );
};

export default RowActionButton;
