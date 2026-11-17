"use client";

import { cn } from "@shared/lib/cn";
import * as React from "react";
import type { AuditStatus } from "@entities/audit/model";
import type { ProjectStatus } from "@entities/projects/model";

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
      size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-xs"; // sm (por defecto)

    const toneMap: Record<BadgeTone, { solid: string; soft: string; outline: string }> = {
      neutral: { solid: "bg-[var(--kma-fg)] text-[var(--kma-surface)]", soft: "bg-[var(--kma-subtle)] text-[var(--kma-muted)] ring-1 ring-inset ring-[var(--kma-border)]", outline: "text-[var(--kma-muted)] ring-1 ring-inset ring-[var(--kma-border)]" },
      success: { solid: "bg-[var(--kma-success)] text-[var(--kma-surface)]", soft: "bg-[var(--kma-success-bg)] text-[var(--kma-success)] ring-1 ring-inset ring-[var(--kma-success-border)]", outline: "text-[var(--kma-success)] ring-1 ring-inset ring-[var(--kma-success-border)]" },
      warning: { solid: "bg-[var(--kma-warning)] text-[var(--kma-surface)]", soft: "bg-[var(--kma-warning-bg)] text-[var(--kma-warning)] ring-1 ring-inset ring-[var(--kma-warning-border)]", outline: "text-[var(--kma-warning)] ring-1 ring-inset ring-[var(--kma-warning-border)]" },
      danger: { solid: "bg-[var(--kma-danger)] text-[var(--kma-surface)]", soft: "bg-[var(--kma-danger-bg)] text-[var(--kma-danger)] ring-1 ring-inset ring-[var(--kma-danger-border)]", outline: "text-[var(--kma-danger)] ring-1 ring-inset ring-[var(--kma-danger-border)]" },
      info: { solid: "bg-[var(--kma-info)] text-[var(--kma-surface)]", soft: "bg-[var(--kma-info-bg)] text-[var(--kma-info)] ring-1 ring-inset ring-[var(--kma-info-border)]", outline: "text-[var(--kma-info)] ring-1 ring-inset ring-[var(--kma-info-border)]" },
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

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  audit_in_progress: "Fieldwork in progress",
  draft_report_pending_review: "Pending review",
  draft_report_in_review: "In review",
  final_report_sent_to_client: "Delivered",
  completed: "Completed",
  deleted: "Deleted",
  unknown: "Status unavailable",
};

const STATUS_LABELS = AUDIT_STATUS_LABELS;

export function StatusBadge({
  status,
  className,
  ...rest
}: { status: AuditStatus } & Omit<
  BadgeProps,
  "children" | "tone" | "variant"
>) {
  const label = STATUS_LABELS[status];
  const tone: BadgeTone = status === "draft_report_pending_review" ? "warning" : status === "draft_report_in_review" ? "info" : status === "completed" || status === "final_report_sent_to_client" ? "success" : "neutral";

  return (
    <Badge
      variant="soft"
      tone={tone}
      className={cn("tracking-tight", className)}
      {...rest}
    >
      {label}
    </Badge>
  );
}

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function ProjectStatusBadge({
  status,
  className,
  variant,
  size = "sm",
  ...rest
}: { status: ProjectStatus } & Omit<BadgeProps, "children" | "tone">) {
  const tone = status === "ACTIVE" ? "success" : "neutral";
  const safeVariant: BadgeVariant =
    variant ?? (status === "ACTIVE" ? "soft" : "outline");

  return (
    <Badge
      variant={safeVariant}
      tone={tone}
      size={size}
      className={cn("tracking-tight", className)}
      {...rest}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
