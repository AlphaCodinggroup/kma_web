"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import { formatIsoToYmdHm } from "@shared/lib/date";

export interface AuditInfoPanelProps {
  auditDate: string;
  completedDate?: string | null;
  className?: string;
  containerPaddingClassName?: string;
  ariaLabelledById?: string;
}

function toIso(d: string | Date): string | undefined {
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  } catch {
    return undefined;
  }
}

export const AuditInfoPanel: React.FC<AuditInfoPanelProps> = ({
  auditDate,
  completedDate,
  className,
  containerPaddingClassName = "px-4 sm:px-6 lg:px-8",
  ariaLabelledById,
}) => {
  return (
    <section
      className={cn("w-full", containerPaddingClassName, className)}
      aria-labelledby={ariaLabelledById}
      data-testid="audit-info-panel"
    >
      <div className="rounded-2xl border border-gray-100 bg-card p-4 shadow-sm sm:p-6">
        <h3 id={ariaLabelledById} className="mb-4 text-base font-bold">
          Audit Information
        </h3>

        <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">
              Audit Date
            </dt>
            <dd className="mt-1 text-sm" data-testid="audit-date">
              {formatIsoToYmdHm(auditDate)}
            </dd>
          </div>

          <div className="sm:justify-self-end">
            <dt className="text-sm font-semibold text-muted-foreground">
              Completed Date
            </dt>
            <dd className="mt-1 text-sm" data-testid="completed-date">
              {formatIsoToYmdHm(completedDate)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

export default AuditInfoPanel;
