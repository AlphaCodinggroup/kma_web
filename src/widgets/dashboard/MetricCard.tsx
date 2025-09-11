"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import {
  FileText,
  BarChart3,
  CheckCircle2,
  type LucideProps,
} from "lucide-react";

type IconKey = "file-text" | "bar-chart-3" | "check-circle-2";

const ICONS: Record<IconKey, React.ComponentType<LucideProps>> = {
  "file-text": FileText,
  "bar-chart-3": BarChart3,
  "check-circle-2": CheckCircle2,
};

export type MetricCardProps = {
  title: string;
  value: React.ReactNode;
  subtitle?: string | undefined;
  icon?: IconKey | undefined;
  /** id útil para tests (Playwright/Vitest) */
  "data-testid"?: string | undefined;
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  "data-testid": testId,
}) => {
  const Icon = icon ? ICONS[icon] : undefined;
  return (
    <Card
      data-testid={testId}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-md font-semibold">{title}</CardTitle>
          {Icon ? (
            <Icon className="h-4 w-4 text-gray-600" aria-hidden="true" />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {subtitle ? (
          <div className="mt-1 text-xs text-gray-600">{subtitle}</div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
