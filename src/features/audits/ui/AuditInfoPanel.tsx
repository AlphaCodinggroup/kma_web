"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import { formatIsoToYmdHm } from "@shared/lib/date";

export interface AuditInfoPanelProps {
  auditDate: string;
  completedDate?: string | null;
  projectName?: string | null | undefined;
  facilityName?: string | null | undefined;
  location?: string | null | undefined;
  auditorName?: string | null | undefined;
  className?: string;
  containerPaddingClassName?: string;
  ariaLabelledById?: string;
}


export const AuditInfoPanel: React.FC<AuditInfoPanelProps> = ({
  auditDate,
  completedDate,
  projectName,
  facilityName,
  location,
  auditorName,
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
      <div>
        <h2 id={ariaLabelledById} className="mb-4 text-sm font-semibold">
          Audit Information
        </h2>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6 [&>div]:min-w-0 [&>div]:border-t [&>div]:border-[var(--kma-border)] [&>div]:pt-3">
          <div>
            <dt className="text-xs font-medium text-[var(--kma-muted)]">
              Audit Date
            </dt>
            <dd className="mt-1.5 break-words text-sm font-medium" data-testid="audit-date">
              {formatIsoToYmdHm(auditDate)}
            </dd>
          </div>

          <div className="min-w-0 break-words">
            <dt className="text-xs font-medium text-[var(--kma-muted)]">
              Completed Date
            </dt>
            <dd className="mt-1.5 break-words text-sm font-medium" data-testid="completed-date">
              {formatIsoToYmdHm(completedDate)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-[var(--kma-muted)]">
              Project
            </dt>
            <dd className="mt-1.5 break-words text-sm font-medium" data-testid="project-name">
              {projectName || "—"}
            </dd>
          </div>

          <div className="min-w-0 break-words">
            <dt className="text-xs font-medium text-[var(--kma-muted)]">
              Facility
            </dt>
            <dd className="mt-1.5 break-words text-sm font-medium" data-testid="facility-name">
              {facilityName || "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-[var(--kma-muted)]">
              Auditor
            </dt>
            <dd className="mt-1.5 break-words text-sm font-medium" data-testid="auditor-name">
              {auditorName || "—"}
            </dd>
          </div>

          <div className="min-w-0 break-words">
            <dt className="text-xs font-medium text-[var(--kma-muted)]">
              Location
            </dt>
            <dd className="mt-1.5 break-words text-sm font-medium" data-testid="location">
              {location || "—"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

export default AuditInfoPanel;
