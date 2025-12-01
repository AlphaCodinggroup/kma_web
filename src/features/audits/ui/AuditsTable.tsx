"use client";

import React, { memo, useMemo } from "react";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@shared/ui/badge";
import { cn } from "@shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import RowActionButton from "@shared/ui/row-action-button";
import type { Audit } from "@entities/audit/model";
import { formatIsoToYmdHm } from "@shared/lib/date";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";

export interface AuditsTableProps {
  items: Audit[];
  onEdit?: (audit: Audit) => void;
  emptyMessage?: string;
  bodyMaxHeightClassName?: string;
  loading?: boolean;
  error?: boolean;
  onError: () => void;
}

/**
 * Tabla de auditorías: columnas [Project, Auditor, Status, Audit Date, Actions]
 */
const AuditsTable: React.FC<AuditsTableProps> = ({
  items,
  onEdit,
  emptyMessage = "No audits found",
  bodyMaxHeightClassName,
  loading = false,
  error,
  onError,
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

  return (
    <div className={cn("w-full bg-white")}>
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
                  colSpan={5}
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
                  <RowActionButton
                    icon={Pencil}
                    ariaLabel="Edit audit"
                    onClick={() => onEdit?.(row)}
                    size="md"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default memo(AuditsTable);
