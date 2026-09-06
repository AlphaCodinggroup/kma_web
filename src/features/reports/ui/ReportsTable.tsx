"use client";

import React, { useState, useMemo } from "react";
import { Download, Archive, ArchiveRestore, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { useSession } from "@processes/auth/hooks";

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
  onRestore: (id: string) => void;
  onError: () => void;
  deletingId?: string | null | undefined;
  restoringId?: string | null | undefined;
}

type SortColumn = "project" | "status" | "date";
type SortDirection = "asc" | "desc" | null;

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
  onRestore,
  onError,
  deletingId,
  restoringId,
}) => {
  const { isAdmin } = useSession();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortColumn || !sortDirection) return items;

    const sorted = [...items].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortColumn) {
        case "project":
          aVal = a.reportName?.toLowerCase() ?? "";
          bVal = b.reportName?.toLowerCase() ?? "";
          break;
        case "status":
          aVal = a.status?.toLowerCase() ?? "";
          bVal = b.status?.toLowerCase() ?? "";
          break;
        case "date":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [items, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 text-black" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-4 w-4 text-black" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  if (isLoading) return <Loading text="Loading reports" />;

  if (isError)
    return (
      <Retry
        text="Failed to load reports. Please try again."
        onClick={onError}
      />
    );

  const hasItems = sortedItems.length > 0;

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
              <TableHead>
                <button
                  onClick={() => handleSort("project")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Project
                  <SortIcon column="project" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Status
                  <SortIcon column="status" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Created At
                  <SortIcon column="date" />
                </button>
              </TableHead>
              <TableHead>Version / Included audits</TableHead>
              <TableHead>PDF / Archive</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((r) => {
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
                      <div className="text-xs text-gray-600">
                        <div>Attempt {r.attempt}</div>
                        <div className="max-w-72 truncate" title={r.includedAudits.join(", ")}>{r.includedAudits.join(", ") || "No manifest details"}</div>
                      </div>
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
                          disabled={!r.reportUrl || isDownloading || Boolean(r.archivedAt)}
                        />
                        <RowActionButton
                          icon={r.archivedAt ? ArchiveRestore : Archive}
                          ariaLabel={r.archivedAt ? "Restore report version" : "Archive report version"}
                          onClick={() => r.archivedAt ? onRestore(r.id) : onDelete(r.id)}
                          size="md"
                          disabled={deletingId === r.id || restoringId === r.id || !isAdmin}
                          title={!isAdmin ? "Only administrators can archive reports" : r.archivedAt ? "Restore this report version" : "Archive this report version"}
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
