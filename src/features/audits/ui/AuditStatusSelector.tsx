"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";
import type { AuditStatus } from "@entities/audit/model";
import { AUDIT_STATUS_LABELS } from "@shared/ui/badge";

type Props = {
  value?: AuditStatus | undefined;
  onChange?: (status: AuditStatus) => void;
  disabled?: boolean | undefined;
  isLoading?: boolean;
  className?: string;
  label?: string;
};

const auditStatusOptions: AuditStatus[] = [
  "draft_report_pending_review",
  "draft_report_in_review",
  "final_report_sent_to_client",
  "completed",
];

export const AuditStatusSelector: React.FC<Props> = ({
  value,
  onChange,
  disabled = false,
  isLoading = false,
  className,
  label = "Audit status",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as AuditStatus;
    onChange?.(next);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {label}
      </span>

      <select
        value={value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className={cn(
          "h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium",
          "text-foreground shadow-sm transition focus:outline-none focus:ring-2 focus:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-70"
        )}
      >
        {auditStatusOptions.map((opt) => (
          <option key={opt} value={opt}>
            {AUDIT_STATUS_LABELS[opt]}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AuditStatusSelector;
