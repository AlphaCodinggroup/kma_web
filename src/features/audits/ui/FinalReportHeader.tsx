"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";

export interface FinalReportHeaderProps {
  className?: string;
}

/** Encabezado de la pestaña Report. Las acciones viven en ReportActionBar. */
const FinalReportHeader: React.FC<FinalReportHeaderProps> = ({ className }) => (
  <div className={cn("flex flex-col gap-1 py-1 sm:py-2", className)}>
    <h2 className="text-lg font-semibold leading-snug">Draft Report</h2>
    <p className="mt-1 text-sm text-[var(--kma-muted)]">
      Preview in the final PDF format. Quantity, measurements and QC notes can be edited in place.
    </p>
  </div>
);

export default FinalReportHeader;
