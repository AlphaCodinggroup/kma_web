"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Eye, Download } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Badge } from "@shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import RowActionButton from "@shared/ui/row-action-button";

/** ViewModel mínimo para la tabla (visual-only). */
export interface ReportRowVM {
  id: string; // e.g. RPT-001
  auditId: string; // para link a /audits/[id]/report
  projectName: string;
  auditor: string;
  reviewer: string;
  generatedDate: string; // ISO string
  totalFindings: number;
  totalCost: number; // monto total
}

export interface ReportsTableProps {
  items: ReportRowVM[];
  className?: string;
  onView?: (auditId: string) => void;
  onDownload?: (reportId: string) => void;
  /** Limitar altura para scroll interno (opcional) */
  bodyMaxHeightClassName?: string;
  emptyMessage?: string;
}

/**
 * Tabla de Reports: columnas
 * [Report ID, Project Name, Auditor, Reviewer, Generated Date, Findings, Total Cost, Actions]
 */
const ReportsTable: React.FC<ReportsTableProps> = ({
  items,
  className,
  onView,
  onDownload,
  bodyMaxHeightClassName,
  emptyMessage = "No reports found",
}) => {
  const hasItems = items.length > 0;

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
              <TableHead className="w-[120px]">Report ID</TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Generated Date</TableHead>
              <TableHead className="text-right">Findings</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
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
                const viewHref = `/audits/${r.auditId}/report` as Route;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell className="truncate">{r.projectName}</TableCell>
                    <TableCell>{r.auditor}</TableCell>
                    <TableCell>{r.reviewer}</TableCell>
                    <TableCell>
                      {new Date(r.generatedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="soft"
                        tone="neutral"
                        className="font-medium"
                      >
                        {r.totalFindings}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${r.totalCost.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* View */}
                        <Link href={viewHref}>
                          <RowActionButton
                            icon={Eye}
                            ariaLabel="Delete project"
                            onClick={(e) => {
                              if (onView) {
                                e.preventDefault();
                                onView(r.auditId);
                              }
                            }}
                            size="md"
                          />
                        </Link>

                        {/* Download */}
                        <RowActionButton
                          icon={Download}
                          ariaLabel="Delete project"
                          onClick={() => onDownload?.(r.id)}
                          size="md"
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
