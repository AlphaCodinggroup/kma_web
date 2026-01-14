"use client";

import React from "react";
import { Download, Trash2 } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { StatusBadge } from "@shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import RowActionButton from "@shared/ui/row-action-button";
import type { ReportListItem } from "@entities/report/model/report-list";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import { formatIsoToYmdHm } from "@shared/lib/date";

export interface ReportsTableProps {
  items: ReportListItem[];
  className?: string;
  bodyMaxHeightClassName?: string;
  emptyMessage?: string;
  isLoading: boolean;
  isError: boolean;
  isDownloading: boolean;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onError: () => void;
  deletingId?: string | null | undefined;
}

/**
 * Tabla de Reports: solo columnas requeridas.
 */
const ReportsTable: React.FC<ReportsTableProps> = ({
  items,
  className,
  bodyMaxHeightClassName,
  emptyMessage = "No reports found",
  isError,
  isLoading,
  isDownloading,
  onDownload,
  onDelete,
  onError,
  deletingId,
}) => {
  const hasItems = items.length > 0;

  if (isLoading) return <Loading text="Loading reports" />;

  if (isError)
    return (
      <Retry
        text="Failed to load reports. Please try again."
        onClick={onError}
      />
    );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200",
        className
      )}
    >
      <div className={cn("overflow-auto", bodyMaxHeightClassName)}>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="bg-white">
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Export to PDF</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => {
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="truncate">{r.reportName ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      {formatIsoToYmdHm(r.createdAt) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Download button - always shown but disabled if no reportUrl */}
                        <RowActionButton
                          icon={Download}
                          ariaLabel={
                            r.reportUrl
                              ? "Download report"
                              : "Report not available yet"
                          }
                          onClick={() => onDownload(r.id)}
                          size="md"
                          disabled={!r.reportUrl || isDownloading}
                        />
                        <RowActionButton
                          icon={Trash2}
                          ariaLabel="Delete report"
                          onClick={() => onDelete(r.id)}
                          size="md"
                          disabled={deletingId === r.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ReportsTable;
