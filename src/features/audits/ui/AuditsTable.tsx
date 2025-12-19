"use client";

import React, { memo } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
  emptyMessage?: string;
  bodyMaxHeightClassName?: string;
  loading?: boolean;
  fetching?: boolean; // NEW: for showing loading state during filter changes
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

/**
 * Tabla de auditorías: columnas [Project, Auditor, Status, Audit Date, Actions]
 */
const AuditsTable: React.FC<AuditsTableProps> = ({
  items,
  onEdit,
  onDelete,
  deletingId,
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
  if (loading) return <Loading text="Loading audits…" />;

  if (error)
    return (
      <Retry
        text="Failed to load audits. Please try again."
        onClick={onError}
      />
    );

  const hasItems = items.length > 0;
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
              <TableHead>Project</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead className="w-[20%]">Status</TableHead>
              <TableHead className="w-[15%]">Audit Date</TableHead>
              <TableHead className="w-[5%] text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}

            {items.map((row) => (
              <TableRow key={`${row.id}-${row.version}`}>
                <TableCell>{row.projectName ?? "—"}</TableCell>
                <TableCell>{row.facilityName ?? "—"}</TableCell>
                <TableCell>{row.auditorName ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatIsoToYmdHm(row.createdAt) ?? "—"}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <RowActionButton
                      icon={Pencil}
                      ariaLabel="Edit audit"
                      onClick={() => onEdit?.(row)}
                      size="md"
                    />
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
