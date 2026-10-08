"use client";

import {
  FileText,
  BarChart3,
  CheckCircle2,
  UserPlus,
  ShieldCheck,
  BadgeCheck,
  Briefcase,
  Building,
  AlertCircle,
  FileCheck,
  Clock,
  Eye,
  Send,
  type LucideProps,
} from "lucide-react";

type IconKey =
  | "file-text"
  | "bar-chart-3"
  | "check-circle-2"
  | "user-plus"
  | "shield-check"
  | "badge-check"
  | "brief-case"
  | "building"
  | "alert-circle"
  | "file-check"
  | "clock"
  | "eye"
  | "send";

const ICONS: Record<IconKey, React.ComponentType<LucideProps>> = {
  "file-text": FileText,
  "bar-chart-3": BarChart3,
  "check-circle-2": CheckCircle2,
  "user-plus": UserPlus,
  "shield-check": ShieldCheck,
  "badge-check": BadgeCheck,
  "brief-case": Briefcase,
  "building": Building,
  "alert-circle": AlertCircle,
  "file-check": FileCheck,
  "clock": Clock,
  "eye": Eye,
  "send": Send,
};

export type MetricCardProps = {
  title: string;
  value: React.ReactNode;
  subtitle?: string | undefined;
  icon?: IconKey | undefined;
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
    <article data-testid={testId} className="min-w-0 bg-[var(--kma-surface)] px-5 py-5">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-[var(--kma-muted)]" aria-hidden="true" /> : null}
        <h3 className="text-sm font-medium text-[var(--kma-muted)]">{title}</h3>
      </div>
      <div className="mt-3 font-heading text-[32px] leading-none font-medium tabular-nums tracking-tight text-[var(--kma-fg)]">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-[var(--kma-muted)]">{subtitle}</div> : null}
    </article>
  );
};

export default MetricCard;
