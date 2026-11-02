"use client";

import React from "react";
import { cn } from "@shared/lib/cn";

export interface UsersMetricsProps {
  metrics: {
    totalUsers: number;
    auditors: number;
    qcManagers: number;
    projectManagers: number;
  };
  className?: string | undefined;
}

const UsersMetrics: React.FC<UsersMetricsProps> = ({ metrics, className }) => {
  return (
    <dl className={cn("grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] sm:grid-cols-4", className)}>
      {[
        ["Total Users", metrics.totalUsers],
        ["Auditors", metrics.auditors],
        ["QC Managers", metrics.qcManagers],
        ["Administrators", metrics.projectManagers],
      ].map(([label, value], index) => (
        <div key={label} className={cn("flex min-w-0 flex-wrap items-center justify-between gap-2 p-4 sm:block sm:space-y-2 sm:p-5", index % 2 === 1 && "border-l border-[var(--kma-border)]", index === 2 && "border-t border-[var(--kma-border)] sm:border-l sm:border-t-0", index === 3 && "border-t border-[var(--kma-border)] sm:border-t-0")}>
          <dt><h3 className="text-sm font-medium text-[var(--kma-muted)]">{label}</h3></dt>
          <dd className="text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default UsersMetrics;
