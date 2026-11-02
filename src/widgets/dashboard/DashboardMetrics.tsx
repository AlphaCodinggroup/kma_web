"use client";

import React from "react";
import MetricCard, {
  type MetricCardProps,
} from "@widgets/dashboard/MetricCard";

export type DashboardMetricItem = {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  /** Clave serializable para el ícono (ver MetricCard) */
  icon?: MetricCardProps["icon"];
  "data-testid"?: string;
};

type DashboardMetricsProps = {
  items: DashboardMetricItem[];
  className?: string;
  "data-testid"?: string;
};

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  items,
  className,
  "data-testid": testId,
}) => {
  return (
    <div
      data-testid={testId}
      className={["grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-border)] md:grid-cols-4 xl:grid-cols-1", className]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((m, idx) => (
        <MetricCard
          key={`${m.title}-${idx}`}
          title={m.title}
          value={m.value}
          subtitle={m.subtitle}
          icon={m.icon}
          data-testid={m["data-testid"]}
        />
      ))}
    </div>
  );
};

export default DashboardMetrics;
