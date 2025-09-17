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
        "mb-6 flex justify-between gap-4 border-b border-gray-200 pb-4",
        alignClass,
        className
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "truncate text-2xl font-semibold tracking-tight text-black",
            titleClassName
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={cn(
              "mt-1 text-sm font-semibold text-gray-600",
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
                onClick={primaryAction.onClick}
                data-testid={primaryAction["data-testid"]}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 cursor-pointer",
                  "text-white shadow-sm transition-colors",
                  "hover:bg-black/90 focus-visible:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-black/30"
                )}
              >
                <Icon className="h-4 w-4" />
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
