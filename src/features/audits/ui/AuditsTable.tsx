"use client";

import React, { useMemo } from "react";
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

export interface AuditsTableProps {
  items: Audit[];
  total: number;
  onEdit?: (id: string) => void;
  emptyMessage?: string;
  bodyMaxHeightClassName?: string;
}

/**
 * Tabla de auditorías: columnas [Project, Auditor, Status, Audit Date, Actions]
 */
const AuditsTable: React.FC<AuditsTableProps> = ({
  items,
  total,
  onEdit,
  emptyMessage = "No audits found",
  bodyMaxHeightClassName,
}) => {
  return (
    <div className={cn("w-full bg-white")}>
      <div
        className={cn(bodyMaxHeightClassName ?? "max-h-dvh", "overflow-y-auto")}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
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
            {!total && (
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
              <TableRow key={row.id}>
                <TableCell>{row.projectId ?? "—"}</TableCell>
                <TableCell>{row.createdBy ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.createdAt ?? "—"}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <RowActionButton
                    icon={Pencil}
                    ariaLabel="Edit audit"
                    onClick={() => onEdit?.(row.id)}
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

export default AuditsTable;
