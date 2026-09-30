"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";

export interface FinalReportHeaderProps {
  className?: string;
}

/** Encabezado de la pestaña Report. Las acciones viven en ReportActionBar. */
const FinalReportHeader: React.FC<FinalReportHeaderProps> = ({ className }) => (
  <div className={cn("bg-[var(--kma-bg)] px-4 py-3 sm:px-5 sm:py-4", className)}>
    <h2 className="text-base font-bold leading-none">Draft Report</h2>
    <p className="mt-1 text-sm text-gray-600">
      Preview in the final PDF format. Quantity, measurements and QC notes can be edited in place.
    </p>
  </div>
);

export default FinalReportHeader;
