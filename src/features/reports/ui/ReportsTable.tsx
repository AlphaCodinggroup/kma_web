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

/** Botón estilo outline (local al componente, reusable si luego lo extraemos a @shared/ui). */
const OutlineButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, children, ...props }) => (
  <button
    className={cn(
      "inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900",
      "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

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
              <TableHead className="w-[220px]">Actions</TableHead>
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
                          <OutlineButton
                            aria-label="View"
                            onClick={(e) => {
                              if (onView) {
                                e.preventDefault();
                                onView(r.auditId);
                              }
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </OutlineButton>
                        </Link>

                        {/* Download */}
                        <OutlineButton
                          aria-label="Download"
                          onClick={() => onDownload?.(r.id)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </OutlineButton>
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
