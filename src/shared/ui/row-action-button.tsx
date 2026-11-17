"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import { Tooltip } from "@shared/ui/tooltip";

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
  const sizeCls = size === "sm" ? "h-8 w-8 rounded" : "h-9 w-9 rounded";

  const variantCls =
    variant === "danger"
      ? cn(
          "bg-[var(--kma-surface)] text-[var(--kma-danger)]",
          "hover:bg-[var(--kma-danger-bg)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--kma-primary)]/30",
          "border border-[var(--kma-border)]"
        )
      : cn(
          "bg-[var(--kma-surface)] text-[var(--kma-fg)]",
          "hover:bg-[var(--kma-subtle)] ",
          "focus-visible:ring-2 focus-visible:ring-[var(--kma-primary)]/30",
          "border border-[var(--kma-border)]"
        );

  const disabledCls = disabled ? "opacity-60 hover:bg-[var(--kma-surface)]" : "cursor-pointer";

  return (
    <Tooltip content={ariaLabel}>
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center transition-colors max-md:min-h-11 max-md:min-w-11",
        sizeCls,
        variantCls,
        disabledCls,
        className
      )}
      disabled={disabled}
      {...props}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
    </Tooltip>
  );
};

export default RowActionButton;
