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
  auditId: string;
  auditor: string;
  status: AuditStatus;
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
  auditId,
  auditor,
  status,
  backHref,
  backLabel,
  onBack,
  className,
  containerPaddingClassName = "px-4 sm:px-6 lg:px-8",
  rightActions,
  headingId = "audit-edit-heading",
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
      className={cn("w-full", containerPaddingClassName, className)}
      aria-labelledby={headingId}
      data-testid="audit-edit-header"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Izquierda: Back + stack (título/subtítulo) */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href={(backHref ?? "#") as Route}
            onClick={handleBack}
            className={cn(
              "mt-[6px] inline-flex shrink-0 items-center gap-2",
              "font-semibold text-foreground no-underline",
              "hover:opacity-70 transition-opacity"
            )}
            aria-label={label}
            data-testid="audit-back-link"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>

          <div className="ml-4 min-w-0">
            <h1
              id={headingId}
              className="truncate text-3xl font-extrabold leading-tight"
            >
              {title}
            </h1>
            <p className="truncate text-base text-muted-foreground">
              <span className="font-medium">Audit ID:</span> {auditId}
              <span className="mx-2">•</span>
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
