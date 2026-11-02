"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { StatusBadge } from "@shared/ui/badge";
import type { AuditStatus } from "@entities/audit/model";

export interface AuditEditHeaderProps {
  title: string;
  auditor: string;
  status: AuditStatus;
  flowName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  backHref?: Route;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
  containerPaddingClassName?: string;
  rightActions?: React.ReactNode;
  headingId?: string;
}

export const AuditEditHeader: React.FC<AuditEditHeaderProps> = ({
  title,
  auditor,
  status,
  backHref,
  backLabel,
  onBack,
  className,
  containerPaddingClassName = "px-4 sm:px-6 lg:px-8",
  rightActions,
  headingId = "audit-edit-heading",
  flowName: _flowName,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
}) => {
  const router = useRouter();
  const label = backLabel ?? (backHref ? "Back" : "Go back");

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onBack) {
      e.preventDefault();
      onBack();
      return;
    }
    if (!backHref) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <header
      className={cn("w-full border-b border-[var(--kma-border)] bg-[var(--kma-surface)] py-6", containerPaddingClassName, className)}
      aria-labelledby={headingId}
      data-testid="audit-edit-header"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Izquierda: Back + stack (título/subtítulo) */}
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
          <Link
            href={(backHref ?? "#") as Route}
            onClick={handleBack}
            className={cn(
              "inline-flex min-h-[var(--kma-control-height)] shrink-0 items-center gap-2 rounded border border-[var(--kma-border)] px-3 text-sm",
              "font-semibold text-[var(--kma-fg)] no-underline",
              "hover:bg-[var(--kma-input)] transition-colors"
            )}
            aria-label={label}
            data-testid="audit-back-link"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>

          <div className="min-w-0">
            <h1
              id={headingId}
              className="kma-page-title break-words text-2xl leading-tight sm:text-[32px]"
            >
              {title}
            </h1>
            <p className="mt-1 break-words text-sm text-[var(--kma-muted)]">
              <span className="font-medium">Auditor:</span> {auditor}
            </p>
          </div>
        </div>

        {/* Derecha: estado + acciones */}
        <div className="flex shrink-0 items-center gap-2">
          {rightActions}
          <StatusBadge status={status} />
        </div>
      </div>
    </header>
  );
};

export default AuditEditHeader;
