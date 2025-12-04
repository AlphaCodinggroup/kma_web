"use client";

import React from "react";
import { Download } from "lucide-react";
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
  onError: () => void;
}

/**
 * Tabla de Reports: columnas
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
  onError,
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
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow className="bg-white">
              <TableHead>Report ID</TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Findings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => {
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell className="truncate">{r.projectId}</TableCell>
                    <TableCell>{/* {r.auditor} */}</TableCell>
                    <TableCell>{/* {r.reviewer} */}</TableCell>
                    <TableCell>
                      {formatIsoToYmdHm(r.createdAt) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* <Badge
                        variant="soft"
                        tone="neutral"
                        className="font-medium"
                      >
                        {r.totalFindings}
                      </Badge> */}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.reportUrl && (
                          <RowActionButton
                            icon={Download}
                            ariaLabel="Delete report"
                            onClick={() => onDownload(r.id)}
                            size="md"
                            disabled={isDownloading}
                          />
                        )}
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
