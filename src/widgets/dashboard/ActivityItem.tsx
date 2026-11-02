"use client";

import React from "react";

type Variant = "success" | "warning" | "info" | "danger" | "neutral";

export type ActivityItemProps = {
  project: string;
  facility?: string | undefined;
  flow?: string | undefined;
  auditor: string;
  time: string;
  variant?: Variant;
  "data-testid"?: string;
};

const ActivityItem: React.FC<ActivityItemProps> = ({ project, facility, flow, auditor, time, variant = "success", "data-testid": testId }) => {
  const hasContext = Boolean(facility || flow);
  return (
    <li data-testid={testId} className="px-5 py-4 text-sm">
      {hasContext ? (
        <div className="grid min-w-0 gap-x-5 gap-y-2 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] md:items-center">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className={getDotClass(variant)} aria-hidden="true" />
            <div className="min-w-0"><p className="break-words [overflow-wrap:anywhere] font-medium text-[var(--kma-fg)]">{project}</p>{facility ? <p className="mt-1 break-words [overflow-wrap:anywhere] text-xs text-[var(--kma-muted)]">{facility}</p> : null}</div>
          </div>
          {flow ? <p className="break-words [overflow-wrap:anywhere] pl-[18px] text-[var(--kma-muted)] md:pl-0">{flow}</p> : <span className="hidden md:block" />}
          <p className="break-words [overflow-wrap:anywhere] pl-[18px] text-xs text-[var(--kma-muted)] md:pl-0 md:text-sm"><span className="md:hidden">Completed by </span><span className="font-medium">{auditor}</span></p>
          <p className="pl-[18px] text-xs tabular-nums text-[var(--kma-muted)] md:pl-0 md:text-sm">{time}</p>
        </div>
      ) : (
        <div className="flex items-start gap-2.5">
          <span className={getDotClass(variant)} aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="break-words [overflow-wrap:anywhere]"><span className="font-medium">{project}</span> audit completed by <span className="font-medium">{auditor}</span></p><p className="mt-1 text-xs tabular-nums text-[var(--kma-muted)]">{time}</p></div>
        </div>
      )}
    </li>
  );
};

export default ActivityItem;

function getDotClass(variant: Variant) {
  const base = "mt-1 h-2 w-2 shrink-0 rounded-full";
  switch (variant) {
    case "success": return `${base} bg-[var(--kma-success)]`;
    case "warning": return `${base} bg-[var(--kma-warning)]`;
    case "info": return `${base} bg-[var(--kma-primary)]`;
    case "danger": return `${base} bg-[var(--kma-danger)]`;
    case "neutral":
    default: return `${base} bg-[var(--kma-muted)]`;
  }
}
