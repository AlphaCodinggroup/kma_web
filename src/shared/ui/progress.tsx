"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";

type CommonProgressProps = {
  value: number | null;
  max?: number;
  label: string;
  className?: string | undefined;
};

const clampProgress = (value: number, max: number) =>
  Math.min(Math.max(value, 0), max);

const ariaValue = (value: number | null, max: number) =>
  value === null ? {} : { "aria-valuenow": clampProgress(value, max) };

export function Progress({
  value,
  max = 100,
  label,
  className,
}: CommonProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = value === null ? null : clampProgress(value, safeMax);
  const width = safeValue === null ? 35 : (safeValue / safeMax) * 100;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      {...ariaValue(safeValue, safeMax)}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-[var(--kma-primary)] transition-[width] duration-300",
          safeValue === null && "animate-pulse"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

type ProgressRingProps = CommonProgressProps & {
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
};

export function ProgressRing({
  value,
  max = 100,
  label,
  className,
  size = 120,
  strokeWidth = 9,
  showValue = true,
}: ProgressRingProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = value === null ? null : clampProgress(value, safeMax);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = safeValue === null ? 0.25 : safeValue / safeMax;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      {...ariaValue(safeValue, safeMax)}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={cn(
          "-rotate-90",
          safeValue === null && "animate-spin"
        )}
        width={size}
        height={size}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--kma-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          data-testid="progress-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--kma-primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      {showValue && safeValue !== null ? (
        <span className="absolute text-xl font-semibold text-black">
          {Math.round((safeValue / safeMax) * 100)}%
        </span>
      ) : null}
    </div>
  );
}
