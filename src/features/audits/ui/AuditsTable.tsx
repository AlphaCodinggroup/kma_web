"use client";

import React, { memo, useState, useMemo } from "react";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import type { Audit } from "@entities/audit/model";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import { StatusBadge } from "@shared/ui/badge";
import RowActionButton from "@shared/ui/row-action-button";
import { formatIsoToYmdHm } from "@shared/lib/date";
import { cn } from "@shared/lib/cn";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import Pagination from "@shared/ui/Pagination";

export interface AuditsTableProps {
  items: Audit[];
  onEdit?: (audit: Audit) => void;
  onDelete?: (audit: Audit) => void;
  deletingId?: string | null;
  editingId?: string | null;
  emptyMessage?: string;
  bodyMaxHeightClassName?: string;
  loading?: boolean;
  fetching?: boolean;
  error?: boolean;
  onError: () => void;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

type SortColumn = "project" | "facility" | "flow" | "auditor" | "status" | "date";
type SortDirection = "asc" | "desc" | null;

/**
 * Tabla de auditorías con columnas ordenables
 */
const AuditsTable: React.FC<AuditsTableProps> = ({
  items,
  onEdit,
  onDelete,
  deletingId,
  editingId,
  emptyMessage = "No audits found",
  bodyMaxHeightClassName,
  loading = false,
  fetching = false,
  error,
  onError,
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
}) => {
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
          aVal = a.projectName?.toLowerCase() ?? "";
          bVal = b.projectName?.toLowerCase() ?? "";
          break;
        case "facility":
          aVal = a.facilityName?.toLowerCase() ?? "";
          bVal = b.facilityName?.toLowerCase() ?? "";
          break;
        case "flow":
          aVal = a.flowName?.toLowerCase() ?? "";
          bVal = b.flowName?.toLowerCase() ?? "";
          break;
        case "auditor":
          aVal = a.auditorName?.toLowerCase() ?? "";
          bVal = b.auditorName?.toLowerCase() ?? "";
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

  if (loading) return <Loading text="Loading audits…" />;

  if (error)
    return (
      <Retry
        text="Failed to load audits. Please try again."
        onClick={onError}
      />
    );

  const hasItems = sortedItems.length > 0;
  const showPagination = onPageChange && onPageSizeChange && totalItems > 0;

  return (
    <div className={cn("w-full bg-white relative")}>
      {/* Loading overlay for filter changes */}
      {fetching && !loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
            <span className="text-sm text-gray-700 font-medium">Updating...</span>
          </div>
        </div>
      )}

      <div
        className={cn(bodyMaxHeightClassName ?? "max-h-dvh", "overflow-y-auto")}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
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
                  onClick={() => handleSort("facility")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Facility
                  <SortIcon column="facility" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("flow")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Flow
                  <SortIcon column="flow" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("auditor")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Auditor
                  <SortIcon column="auditor" />
                </button>
              </TableHead>
              <TableHead className="w-[18%]">
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Status
                  <SortIcon column="status" />
                </button>
              </TableHead>
              <TableHead className="w-[15%]">
                <button
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Audit Date
                  <SortIcon column="date" />
                </button>
              </TableHead>
              <TableHead className="w-[5%] text-right pr-6 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}

            {sortedItems.map((row) => (
              <TableRow key={`${row.id}-${row.version}`}>
                <TableCell>{row.projectName ?? "—"}</TableCell>
                <TableCell>{row.facilityName ?? "—"}</TableCell>
                <TableCell>{row.flowName ?? "—"}</TableCell>
                <TableCell>{row.auditorName ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatIsoToYmdHm(row.createdAt) ?? "—"}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit?.(row)}
                      disabled={editingId === row.id}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Edit audit"
                    >
                      {editingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        disabled={deletingId === row.id}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Delete audit"
                      >
                        {deletingId === row.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-red-600" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

export default memo(AuditsTable);
