"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/controls";
import { Plus } from "lucide-react";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  "data-testid"?: string | undefined;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  className?: string | undefined;
  titleClassName?: string | undefined;
  subtitleClassName?: string | undefined;
  actionSlot?: React.ReactNode;
  primaryAction?: PageHeaderAction | undefined;
  verticalAlign?: "start" | "center" | "end";
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
  actionSlot,
  primaryAction,
  verticalAlign = "center",
}) => {
  const Icon = primaryAction?.icon ?? Plus;

  const alignClass =
    verticalAlign === "start"
      ? "items-start"
      : verticalAlign === "end"
      ? "items-end"
      : "items-center";

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap justify-between gap-4 border-b border-[var(--kma-border)] pb-6",
        alignClass,
        className
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "kma-page-title text-[var(--kma-fg)]",
            titleClassName
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={cn(
              "mt-2 max-w-[65ch] text-[15px] leading-[22px] text-[var(--kma-muted)]",
              subtitleClassName
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        {actionSlot
          ? actionSlot
          : primaryAction && (
              <Button
                type="button"
                fullWidth={false}
                onClick={primaryAction.onClick}
                data-testid={primaryAction["data-testid"]}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-semibold">
                  {primaryAction.label}
                </span>
              </Button>
            )}
      </div>
    </div>
  );
};

export default PageHeader;
