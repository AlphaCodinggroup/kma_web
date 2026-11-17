"use client";

import React, { useState, useMemo } from "react";
import { Download, FileText, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import type { ReportListItem } from "@entities/report/model/report-list";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import { formatIsoToYmdHm } from "@shared/lib/date";
import { useSession } from "@processes/auth/hooks";
import { Button } from "@shared/ui/controls";
import { MobileEntityRow } from "@shared/ui/mobile-entity-row";
import { useMediaQuery } from "@shared/lib/useMediaQuery";

export interface ReportsTableProps {
  items: ReportListItem[];
  className?: string;
  bodyMaxHeightClassName?: string;
  emptyMessage?: string;
  isLoading: boolean;
  isError: boolean;
  downloadingId: string | null;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onError: () => void;
  deletingId?: string | null | undefined;
}

function ReportRowActions({ report, downloadingId, deletingId, isAdmin, onDownload, onDelete }: Pick<ReportsTableProps, "downloadingId" | "deletingId" | "onDownload" | "onDelete"> & { report: ReportListItem; isAdmin: boolean }) {
  const downloading = downloadingId === report.id;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="secondary" fullWidth={false} isLoading={downloading} aria-label={downloading ? "Downloading report" : report.reportUrl ? "Download report" : "Report not available yet"} disabled={!report.reportUrl || downloading} onClick={() => onDownload(report.id)}>
        {!downloading && <Download className="h-4 w-4" aria-hidden="true" />}
        {downloading ? "Downloading…" : "Download"}
      </Button>
      <Button variant="ghost" fullWidth={false} aria-label="Delete report" disabled={deletingId === report.id || !isAdmin} onClick={() => onDelete(report.id)} title={!isAdmin ? "Only administrators can delete reports" : "Delete report"}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />Delete
      </Button>
    </div>
  );
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
  downloadingId,
  onDownload,
  onDelete,
  onError,
  deletingId,
}) => {
  const { isAdmin } = useSession();
  const compact = useMediaQuery("(max-width: 1023px)");
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
      return <ArrowUpDown className="h-4 w-4 text-[var(--kma-muted)]" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 text-[var(--kma-fg)]" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-4 w-4 text-[var(--kma-fg)]" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-[var(--kma-muted)]" />;
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
        "overflow-hidden rounded-lg border border-[var(--kma-border)]",
        className
      )}
    >
      {compact ? <>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--kma-border)] bg-[var(--kma-subtle)] px-4 py-3">
          <label className="min-w-0 flex-1 text-sm text-[var(--kma-muted)]">
            Sort reports by
            <select
              value={sortColumn ?? ""}
              onChange={event => {
                if (!event.target.value) {
                  setSortColumn(null);
                  setSortDirection(null);
                } else {
                  handleSort(event.target.value as SortColumn);
                }
              }}
              className="mt-1 min-h-11 w-full min-w-0 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 text-sm text-[var(--kma-fg)]"
            >
              <option value="">Default order</option>
              <option value="project">Project</option>
              <option value="status">Status</option>
              <option value="date">Created At</option>
            </select>
          </label>
          <Button
            fullWidth={false}
            variant="secondary"
            disabled={!sortColumn}
            aria-label={sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
            className="min-h-11"
          >
            {sortDirection === "desc" ? <ArrowDown className="h-4 w-4" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
            {sortDirection === "desc" ? "Descending" : "Ascending"}
          </Button>
        </div>
        <ul aria-label="Report results" className="divide-y divide-[var(--kma-border)]">
        {!hasItems && <li className="px-4 py-8 text-sm text-[var(--kma-muted)]">{emptyMessage}</li>}
        {sortedItems.map(report => <MobileEntityRow key={report.id} title={report.reportName ?? "Untitled report"} subtitle="Consolidated project PDF" status={<StatusBadge status={report.status} />} actions={<ReportRowActions report={report} downloadingId={downloadingId} deletingId={deletingId} isAdmin={isAdmin} onDownload={onDownload} onDelete={onDelete} />}>
          <dl><dt>Created</dt><dd className="mt-1 tabular-nums text-[var(--kma-fg)]">{formatIsoToYmdHm(report.createdAt)}</dd></dl>
        </MobileEntityRow>)}
      </ul></> : <div className={cn("overflow-auto", bodyMaxHeightClassName)}>
        <Table className="min-w-[720px] text-sm [&_td]:py-4 [&_th]:py-3 [&_th]:text-[var(--kma-muted)]">
          <TableHeader>
            <TableRow className="bg-[var(--kma-subtle)]">
              <TableHead>
                <button
                  onClick={() => handleSort("project")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Project
                  <SortIcon column="project" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Status
                  <SortIcon column="status" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Created At
                  <SortIcon column="date" />
                </button>
              </TableHead>
              <TableHead className="sticky right-0 bg-[var(--kma-subtle)] text-right">Export to PDF</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-[var(--kma-muted)]"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((r) => {
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-[var(--kma-muted)]" aria-hidden="true" />
                        <div className="min-w-0 max-w-[380px]">
                          <p className="break-words font-semibold">{r.reportName ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="tabular-nums text-[var(--kma-muted)]">
                      {formatIsoToYmdHm(r.createdAt) ?? "—"}
                    </TableCell>
                    <TableCell className="sticky right-0 border-l border-[var(--kma-border)] bg-[var(--kma-surface)]">
                      <ReportRowActions report={r} downloadingId={downloadingId} deletingId={deletingId} isAdmin={isAdmin} onDownload={onDownload} onDelete={onDelete} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>}
    </div>
  );
};

export default ReportsTable;
