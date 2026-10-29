"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";
import ReportsTable from "./ReportsTable";
import type { ReportListItem } from "@entities/report/model/report-list";

export interface ReportsListCardProps {
  items: ReportListItem[];
  totalCount: number;
  description?: string;
  className?: string;
  bodyMaxHeightClassName?: string;
  rightSlot?: React.ReactNode;
  isLoading: boolean;
  isError: boolean;
  downloadingId: string | null;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onError: () => void;
  deletingId?: string | null;
}

const ReportsListCard: React.FC<ReportsListCardProps> = ({
  items,
  totalCount,
  description = "Complete list of generated audit reports",
  className,
  bodyMaxHeightClassName,
  rightSlot,
  isLoading,
  isError,
  downloadingId,
  onDownload,
  onDelete,
  onError,
  deletingId,
}) => {
  return (
    <section
      className={cn("overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]", className)}
    >
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-semibold text-[var(--kma-fg)]">
            All Reports ({totalCount})
          </h2>
          <p className="mt-1 text-sm text-[var(--kma-muted)]">{description}</p>
        </div>
        {rightSlot ? (
          <div className="flex w-full items-center gap-2 lg:w-auto">{rightSlot}</div>
        ) : null}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--kma-border)]" />

      {/* Tabla embebida: sin borde/radius propio para que use los del card */}
      <ReportsTable
        items={items}
        className="!border-0 !rounded-none"
        bodyMaxHeightClassName={cn("max-h-[520px]", bodyMaxHeightClassName)}
        onDownload={onDownload}
        onDelete={onDelete}
        deletingId={deletingId}
        isLoading={isLoading}
        onError={onError}
        isError={isError}
        downloadingId={downloadingId}
      />
      {!isLoading && !isError && <div className="border-t border-[var(--kma-border)] bg-[var(--kma-subtle)] px-4 py-3 text-xs text-[var(--kma-muted)] sm:px-6">{items.length} reports shown · PDF downloads keep the original project format</div>}
    </section>
  );
};

export default ReportsListCard;
