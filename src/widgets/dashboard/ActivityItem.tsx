"use client";

import React from "react";

type Variant = "success" | "warning" | "info" | "danger" | "neutral";

export type ActivityItemProps = {
  project: string;
  auditor: string;
  time: string;
  variant?: Variant;
  /** id para tests (Playwright/Vitest) */
  "data-testid"?: string;
};

/**
 * Item de actividad reciente (átomo)
 * Visual-only. No depende de shadcn para evitar sobrecarga.
 */

const ActivityItem: React.FC<ActivityItemProps> = ({
  project,
  auditor,
  time,
  variant = "success",
  "data-testid": testId,
}) => {
  const dotClass = getDotClass(variant);
  return (
    <li data-testid={testId} className="flex items-start gap-3">
      <span className={dotClass} aria-hidden="true" />
      <div>
        <p className="text-sm">
          <span className="font-medium">{project}</span> audit completed by{" "}
          <span className="font-medium">{auditor}</span>
        </p>
        <p className="text-xs text-gray-600">{time}</p>
      </div>
    </li>
  );
};

export default ActivityItem;

function getDotClass(variant: Variant) {
  const base = "mt-1 h-2 w-2 rounded-full";
  switch (variant) {
    case "success":
      return `${base} bg-emerald-500`;
    case "warning":
      return `${base} bg-amber-500`;
    case "info":
      return `${base} bg-sky-500`;
    case "danger":
      return `${base} bg-rose-500`;
    case "neutral":
    default:
      return `${base} bg-gray-400`;
  }
}
