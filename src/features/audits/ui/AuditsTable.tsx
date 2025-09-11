"use client";

import React from "react";
import { Pencil } from "lucide-react";
import { StatusBadge, type AuditStatus } from "@shared/ui/badge";
import { cn } from "@shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";

export interface AuditRowVM {
  id: string;
  project: string;
  auditor: string;
  status: AuditStatus;
  auditDate: string; // ISO o ya formateada
}

export interface AuditsTableProps {
  items: AuditRowVM[];
  onEdit?: ((id: string) => void) | undefined;
  emptyMessage?: string | undefined;
  bodyMaxHeightClassName?: string | undefined;
}

/**
 * Tabla de auditorías: columnas [ID, Project, Auditor, Status, Audit Date, Actions]
 */
const AuditsTable: React.FC<AuditsTableProps> = ({
  items,
  onEdit,
  emptyMessage = "No audits found",
  bodyMaxHeightClassName,
}) => {
  const hasItems = items.length > 0;

  return (
    <div className={cn("w-full bg-white")}>
      <div
        className={cn(bodyMaxHeightClassName ?? "max-h-dvh", "overflow-y-auto")}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[140px]">ID</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead className="w-[160px]">Audit Date</TableHead>
              <TableHead className="w-[80px] text-right pr-6">
                Actions
              </TableHead>
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
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.id}</TableCell>
                <TableCell>{row.project}</TableCell>
                <TableCell>{row.auditor}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="tabular-nums">{row.auditDate}</TableCell>
                <TableCell className="text-right pr-6">
                  <button
                    type="button"
                    aria-label={`Edit ${row.id}`}
                    onClick={() => onEdit?.(row.id)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-md",
                      "transition-colors hover:bg-gray-100"
                    )}
                  >
                    <Pencil className="h-4 w-4 text-gray-700" aria-hidden />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AuditsTable;
