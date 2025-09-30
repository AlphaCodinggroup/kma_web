"use client";

import { cn } from "@shared/lib/cn";
import * as React from "react";

type BadgeVariant = "solid" | "soft" | "outline";
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | undefined;
  tone?: BadgeTone | undefined;
  size?: BadgeSize | undefined;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = "soft", tone = "neutral", size = "sm", ...props },
    ref
  ) => {
    const sizeCls =
      size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"; // sm (por defecto)

    const toneMap: Record<
      BadgeTone,
      { solid: string; soft: string; outline: string }
    > = {
      neutral: {
        solid: "bg-gray-900 text-white",
        soft: "bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-200",
        outline: "text-gray-700 ring-1 ring-inset ring-gray-300",
      },
      success: {
        solid: "bg-emerald-600 text-white",
        soft: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
        outline: "text-emerald-700 ring-1 ring-inset ring-emerald-300",
      },
      warning: {
        solid: "bg-amber-600 text-white",
        soft: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
        outline: "text-amber-800 ring-1 ring-inset ring-amber-300",
      },
      danger: {
        solid: "bg-red-600 text-white",
        soft: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
        outline: "text-red-700 ring-1 ring-inset ring-red-300",
      },
      info: {
        solid: "bg-sky-600 text-white",
        soft: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
        outline: "text-sky-700 ring-1 ring-inset ring-sky-300",
      },
    };

    const palette = toneMap[tone][variant];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-medium leading-5",
          sizeCls,
          palette,
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

/* -------------------------- Badge de dominio --------------------------- */

export type AuditStatus = "completed" | "in_review" | "pending_review";

export function StatusBadge({
  status,
  className,
  ...rest
}: { status: AuditStatus } & Omit<
  BadgeProps,
  "children" | "tone" | "variant"
>) {
  if (status === "completed") {
    return (
      <Badge
        variant="solid"
        tone="neutral"
        className={cn("tracking-tight", className)}
        {...rest}
      >
        Completed
      </Badge>
    );
  }

  if (status === "in_review") {
    return (
      <Badge
        variant="soft"
        tone="neutral"
        className={cn("tracking-tight", className)}
        {...rest}
      >
        In Review
      </Badge>
    );
  }

  // pending_review
  return (
    <Badge
      variant="soft"
      tone="neutral"
      className={cn("tracking-tight", className)}
      {...rest}
    >
      Pending Review
    </Badge>
  );
}
