"use client";

import React from "react";
import { cn } from "@shared/lib/cn";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  className?: string | undefined;
  titleClassName?: string | undefined;
  subtitleClassName?: string | undefined;
}

/**
 * Átomo reutilizable para encabezados de páginas del dashboard.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
}) => {
  return (
    <div className={cn("space-y-1 mb-4", className)}>
      <h1 className={cn("text-2xl font-extrabold", titleClassName)}>{title}</h1>
      {subtitle ? (
        <p
          className={cn(
            "text-sm font-semibold text-gray-600",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
};

export default PageHeader;
