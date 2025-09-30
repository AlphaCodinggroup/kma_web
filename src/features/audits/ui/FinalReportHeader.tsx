"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/controls";

export interface FinalReportHeaderProps {
  onExport?: (() => void) | undefined;
  exporting?: boolean | undefined;
  className?: string;
}

const FinalReportHeader: React.FC<FinalReportHeaderProps> = ({
  onExport,
  exporting,
  className,
}) => {
  const isDisabled = !onExport || !!exporting;

  return (
    <div className={cn("bg-card/50 px-4 py-3 sm:px-5 sm:py-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-none">Final Report</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onExport}
            disabled={isDisabled}
            className={cn(
              "h-9 rounded-xl border bg-background px-3 text-sm",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
            )}
            aria-label="Export to PDF"
            {...(typeof exporting !== "undefined"
              ? { isLoading: exporting }
              : {})}
          >
            Export to PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinalReportHeader;
