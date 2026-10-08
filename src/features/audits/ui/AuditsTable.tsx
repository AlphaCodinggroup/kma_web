"use client";

import React, { memo, useState, useMemo } from "react";
import { ClipboardCheck, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
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
import { formatIsoToYmdHm } from "@shared/lib/date";
import { cn } from "@shared/lib/cn";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import Pagination from "@shared/ui/Pagination";
import { useSession } from "@processes/auth/hooks";
import { MobileEntityRow } from "@shared/ui/mobile-entity-row";
import { Button } from "@shared/ui/controls";
import { useMediaQuery } from "@shared/lib/useMediaQuery";
import { isAuditReviewAvailable } from "../lib/audit-review-availability";
import { useAuditDetail } from "@features/audits/lib/hooks/useAuditDetail";

/** Columnas que se pueden ocultar cuando el contexto ya las fija. */
export type HideableAuditColumn = "project" | "facility";

export interface AuditsTableProps {
  items: Audit[];
  /** Columnas a ocultar (p. ej. dentro de la facility de un proyecto). */
  hiddenColumns?: readonly HideableAuditColumn[] | undefined;
  onEdit?: (audit: Audit, isCompliant?: boolean) => void;
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
 * Normaliza la respuesta de una pregunta de sí/no.
 * El mapper de detalle devuelve booleanos, pero otras rutas devuelven cadenas.
 */
function normalizeYesNo(
  answer: string | number | boolean | null | undefined
): "YES" | "NO" | "UNSURE" | "OTHER" {
  if (answer === true) return "YES";
  if (answer === false) return "NO";
  const value = String(answer ?? "").trim().toUpperCase();
  if (value === "YES" || value === "TRUE" || value === "SI") return "YES";
  if (value === "NO" || value === "FALSE") return "NO";
  if (value === "UNSURE") return "UNSURE";
  return "OTHER";
}

const SmartEditButton = memo(({
  row,
  onEdit,
  editingId,
  isAdmin,
}: {
  row: Audit;
  onEdit?: ((audit: Audit, isCompliant?: boolean) => void) | undefined;
  editingId?: string | null | undefined;
  isAdmin: boolean;
}) => {
  const available = isAuditReviewAvailable(row.status);
  const checkAnswers = available && row.findingsCount === 0;

  const { data: detail } = useAuditDetail(checkAnswers ? row.id : undefined, {
    enabled: checkAnswers,
    staleTime: Infinity,
  });

  // Una auditoría es "conforme" cuando el backend no encontró hallazgos y todas
  // las preguntas de sí/no tienen una respuesta clara. Un "No" puede ser la
  // rama conforme del flow (p. ej. «¿Es una rampa diagonal?»), así que sólo
  // las respuestas faltantes o UNSURE obligan a revisar.
  //
  // Comparar contra "YES" nunca podía acertar: los pasos Form y Select no
  // llevan respuesta y el mapper normaliza "YES" a booleano `true`.
  let isCompliant = false;
  if (checkAnswers && detail) {
    const yesNoAnswers = (detail.questions ?? [])
      .filter((q) => q.type === "yes_no")
      .map((q) => normalizeYesNo(q.answer));

    isCompliant =
      yesNoAnswers.length > 0 &&
      yesNoAnswers.every((answer) => answer === "YES" || answer === "NO");
  }

  const readOnly = isCompliant || row.status === "completed" || row.status === "final_report_sent_to_client";
  const label = readOnly ? "View audit" : "Review audit";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isCompliant && <span className="text-xs font-medium text-[var(--kma-success)]">Compliant</span>}
      <Button
        variant="secondary"
        fullWidth={false}
        onClick={() => onEdit?.(row, isCompliant)}
        disabled={editingId === row.id || !isAdmin || !available}
        className={cn(
          "min-h-[var(--kma-control-height)] gap-1.5 px-3 text-sm"
        )}
        aria-label={label}
        title={
          !isAdmin
            ? "Only administrators can review audits"
            : !available ? "This audit is not available for review"
            : isCompliant ? "No findings, unsures, or blanks - fully compliant"
            : label
        }
      >
        {editingId === row.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          readOnly ? <Eye className="h-4 w-4" aria-hidden="true" /> : <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {readOnly ? "View" : "Review"}
      </Button>
    </div>
  );
});

/**
 * Tabla de auditorías con columnas ordenables
 */
const AuditsTable: React.FC<AuditsTableProps> = ({
  items,
  hiddenColumns,
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
  const { isAdmin } = useSession();
  const compact = useMediaQuery("(max-width: 1023px)");
  const showProject = !hiddenColumns?.includes("project");
  const showFacility = !hiddenColumns?.includes("facility");
  // 7 columnas visibles por defecto, menos las ocultas.
  const columnCount = 5 + (showProject ? 1 : 0) + (showFacility ? 1 : 0);

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
    <div className={cn("w-full bg-[var(--kma-surface)] relative")}>
      {/* Loading overlay for filter changes */}
      {fetching && !loading && (
        <div className="absolute inset-0 bg-[var(--kma-surface)]/80 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-[var(--kma-surface)] px-4 py-2 rounded-lg border border-[var(--kma-border)]">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--kma-border)] border-t-[var(--kma-primary)]" />
            <span className="text-sm text-[var(--kma-fg)] font-medium">Updating...</span>
          </div>
        </div>
      )}

      {compact ? (
        <>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--kma-border)] bg-[var(--kma-subtle)] px-4 py-3">
          <label className="min-w-0 flex-1 text-sm text-[var(--kma-muted)]">
            Sort audits by
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
              {showProject && <option value="project">Project</option>}
              {showFacility && <option value="facility">Facility</option>}
              <option value="flow">Flow</option>
              <option value="auditor">Auditor</option>
              <option value="status">Status</option>
              <option value="date">Audit Date</option>
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
        <ul aria-label="Audit results" className="divide-y divide-[var(--kma-border)]">
          {!hasItems && <li className="px-4 py-8 text-sm text-[var(--kma-muted)]">{emptyMessage}</li>}
          {sortedItems.map(row => (
            <MobileEntityRow
              key={row.id}
              title={showProject ? row.projectName ?? "Untitled project" : row.flowName ?? "Audit"}
              subtitle={[showFacility ? row.facilityName : null, row.flowName].filter(Boolean).join(" · ")}
              status={<StatusBadge status={row.status} />}
              actions={<><SmartEditButton row={row} onEdit={onEdit} editingId={editingId} isAdmin={isAdmin} />{onDelete && <Button variant="ghost" fullWidth={false} aria-label="Delete audit" onClick={() => onDelete(row)} disabled={!isAdmin || deletingId === row.id}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>}</>}
            >
              <dl className="grid grid-cols-2 gap-4"><div><dt>Auditor</dt><dd className="mt-1 text-[var(--kma-fg)]">{row.auditorName ?? "Not assigned"}</dd></div><div><dt>Audit date</dt><dd className="mt-1 tabular-nums text-[var(--kma-fg)]">{formatIsoToYmdHm(row.createdAt)}</dd></div></dl>
            </MobileEntityRow>
          ))}
        </ul>
        </>
      ) : <div
        className={cn(bodyMaxHeightClassName ?? "max-h-dvh", "overflow-auto")}
      >
        <Table className="min-w-[850px] text-sm [&_td]:py-4 [&_th]:py-3 [&_th]:text-[var(--kma-muted)]">
          <TableHeader>
            <TableRow className="bg-[var(--kma-subtle)]">
              {showProject && (
                <TableHead>
                  <button
                    onClick={() => handleSort("project")}
                    className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                  >
                    Project
                    <SortIcon column="project" />
                  </button>
                </TableHead>
              )}
              {showFacility && (
                <TableHead>
                  <button
                    onClick={() => handleSort("facility")}
                    className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                  >
                    Facility
                    <SortIcon column="facility" />
                  </button>
                </TableHead>
              )}
              <TableHead>
                <button
                  onClick={() => handleSort("flow")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Flow
                  <SortIcon column="flow" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("auditor")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Auditor
                  <SortIcon column="auditor" />
                </button>
              </TableHead>
              <TableHead className="w-[18%]">
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Status
                  <SortIcon column="status" />
                </button>
              </TableHead>
              <TableHead className="w-[15%]">
                <button
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Audit Date
                  <SortIcon column="date" />
                </button>
              </TableHead>
              <TableHead className="sticky right-0 w-[172px] bg-[var(--kma-subtle)] text-right pr-6 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems && (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-10 text-center text-sm text-[var(--kma-muted)]"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}

            {sortedItems.map((row) => (
              // data-testid da un identificador estable a la fila: la tabla no
              // muestra el id de la auditoría en ninguna columna.
              <TableRow
                key={`${row.id}-${row.version}`}
                data-testid={`audit-row-${row.id}`}
              >
                {showProject && <TableCell className="max-w-[240px]"><span className="block break-words font-semibold text-[var(--kma-fg)]">{row.projectName ?? "—"}</span></TableCell>}
                {showFacility && <TableCell className="max-w-[200px] break-words text-[var(--kma-muted)]">{row.facilityName ?? "—"}</TableCell>}
                <TableCell className="max-w-[220px] break-words">{row.flowName ?? "—"}</TableCell>
                <TableCell className="text-[var(--kma-muted)]">{row.auditorName ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatIsoToYmdHm(row.createdAt) ?? "—"}
                </TableCell>
                <TableCell className="sticky right-0 border-l border-[var(--kma-border)] bg-[var(--kma-surface)] text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <SmartEditButton
                      row={row}
                      onEdit={onEdit}
                      editingId={editingId}
                      isAdmin={isAdmin}
                    />
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        disabled={deletingId === row.id || !isAdmin}
                        className="inline-flex min-h-[var(--kma-control-height)] min-w-[var(--kma-control-height)] items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-input)] hover:text-[var(--kma-danger)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Delete audit"
                        title={!isAdmin ? "Only administrators can delete audits" : "Delete audit"}
                      >
                        {deletingId === row.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--kma-border)] border-t-[var(--kma-danger)]" />
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
      </div>}

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
