"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import MetricCard from "@widgets/dashboard/MetricCard";

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
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      <MetricCard
        title="Total Users"
        value={metrics.totalUsers}
        icon="user-plus"
      />
      <MetricCard
        title="Auditors"
        value={metrics.auditors}
        icon="shield-check"
      />
      <MetricCard
        title="QC Managers"
        value={metrics.qcManagers}
        icon="badge-check"
      />
      <MetricCard
        title="Project Managers"
        value={metrics.projectManagers}
        icon="brief-case"
      />
    </div>
  );
};

export default UsersMetrics;
