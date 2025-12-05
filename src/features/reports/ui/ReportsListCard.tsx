"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";
import ReportsTable, { type ReportRowVM } from "./ReportsTable";

export interface ReportsListCardProps {
  items: ReportRowVM[];
  totalCount?: number;
  description?: string;
  className?: string;
  bodyMaxHeightClassName?: string;
  rightSlot?: React.ReactNode;
  onView?: (auditId: string) => void;
  onDownload?: (reportId: string) => void;
}

const ReportsListCard: React.FC<ReportsListCardProps> = ({
  items,
  totalCount,
  description = "Complete list of generated audit reports",
  className,
  bodyMaxHeightClassName,
  rightSlot,
  onView,
  onDownload,
}) => {
  const count = totalCount ?? items.length;

  // Props condicionales para respetar exactOptionalPropertyTypes
  const tableOptionalProps = {
    ...(onView ? { onView } : {}),
    ...(onDownload ? { onDownload } : {}),
  };

  return (
    <section
      className={cn("rounded-2xl border border-gray-200 bg-white", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            All Reports ({count})
          </h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        {rightSlot ? (
          <div className="flex items-center gap-2">{rightSlot}</div>
        ) : null}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Tabla embebida: sin borde/radius propio para que use los del card */}
      <ReportsTable
        items={items}
        className="!border-0 !rounded-none"
        bodyMaxHeightClassName={cn("max-h-[520px]", bodyMaxHeightClassName)}
        {...tableOptionalProps}
      />
    </section>
  );
};

export default ReportsListCard;
