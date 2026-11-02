"use client";

import React, { useState, useMemo } from "react";
import { Pencil, Trash2, MapPin, Archive, ArchiveRestore, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { useMediaQuery } from "@shared/lib/useMediaQuery";
import { MobileEntityRow } from "@shared/ui/mobile-entity-row";
import { Button } from "@shared/ui/controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import RowActionButton from "@shared/ui/row-action-button";
import type { Facility } from "@entities/facility/model";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import { formatIsoToYmdHm } from "@shared/lib/date";
import { useSession } from "@processes/auth/hooks";

export interface FacilityTableProps {
  items: Facility[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore?: (id: string) => void;
  bodyMaxHeightClassName?: string | undefined;
  emptyMessage?: string | undefined;
  className?: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onError: () => void;
  showArchived?: boolean;
}

type SortColumn = "name" | "address" | "date";
type SortDirection = "asc" | "desc" | null;

const FacilityTable: React.FC<FacilityTableProps> = ({
  items,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  bodyMaxHeightClassName,
  emptyMessage = "No facilities found",
  className,
  isLoading = false,
  isError = false,
  onError,
  showArchived = false,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const { isAdmin } = useSession();
  const isCompact = useMediaQuery("(max-width: 1023px)");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      } else setSortDirection("asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortColumn || !sortDirection) return items;

    return [...items].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortColumn) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "address":
          aVal = (a.address || a.city || "").toLowerCase();
          bVal = (b.address || b.city || "").toLowerCase();
          break;
        case "date":
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 text-[var(--kma-muted)]" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 text-[var(--kma-fg)]" />;
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4 text-[var(--kma-fg)]" />;
    return <ArrowUpDown className="h-4 w-4 text-[var(--kma-muted)]" />;
  };

  const hasItems = sortedItems.length > 0;

  if (isLoading) {
    return <Loading text="Loading facilities…" />;
  }

  if (isError) {
    return (
      <Retry
        text="Failed to load facilities. Please try again."
        onClick={onError}
      />
    );
  }

  if (isCompact) return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--kma-border)] px-4 py-3">
        <select aria-label="Sort facilities" value={sortColumn ?? ""} onChange={event => { if (event.target.value) handleSort(event.target.value as SortColumn); else { setSortColumn(null); setSortDirection(null); } }} className="min-h-11 min-w-0 flex-1 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 text-sm"><option value="">Original order</option><option value="name">Facility name</option><option value="address">Address</option><option value="date">Created date</option></select>
        <Button fullWidth={false} variant="ghost" aria-label="Change facility sort direction" onClick={() => handleSort(sortColumn ?? "name")}>{sortDirection === "asc" ? "Ascending" : sortDirection === "desc" ? "Descending" : "Sort"}</Button>
      </div>
      {hasItems ? <ul aria-label="Facilities" className="divide-y divide-[var(--kma-border)]">
        {sortedItems.map(row => <MobileEntityRow key={row.id} title={row.name} subtitle={[row.address, row.city].filter(Boolean).join(" · ")} status={<span className="inline-flex rounded border border-[var(--kma-border)] bg-[var(--kma-subtle)] px-2 py-1 text-xs text-[var(--kma-muted)]">{showArchived ? "Archived" : "Active"}</span>} actions={<>
          <Button fullWidth={false} variant="secondary" disabled={!isAdmin} aria-label="Edit facility" onClick={() => onEdit(row.id)}>Edit</Button>
          {showArchived && onRestore ? <Button fullWidth={false} variant="secondary" disabled={!isAdmin} aria-label="Restore facility" onClick={() => onRestore(row.id)}>Restore</Button> : <>
            <Button fullWidth={false} variant="ghost" disabled={!isAdmin} aria-label="Archive facility" onClick={() => onArchive(row.id)}>Archive</Button>
            <RowActionButton className="min-h-11 min-w-11" icon={Trash2} ariaLabel="Delete facility" variant="danger" disabled={!isAdmin} onClick={() => onDelete(row.id)} />
          </>}
        </>}><dl className="space-y-3"><div><dt className="font-medium text-[var(--kma-fg)]">Created</dt><dd>{row.createdAt ? formatIsoToYmdHm(row.createdAt) : "—"}</dd></div>{row.description ? <div><dt className="font-medium text-[var(--kma-fg)]">Description</dt><dd>{row.description}</dd></div> : null}</dl></MobileEntityRow>)}
      </ul> : <p className="px-4 py-10 text-center text-sm text-[var(--kma-muted)]">{emptyMessage}</p>}
    </div>
  );

  return (
    <div
      className={cn(
        "overflow-x-auto",
        className
      )}
    >
      <Table className="min-w-[760px]">
        <TableHeader className="bg-[var(--kma-subtle)]">
          <TableRow className="[&_th]:h-12">
            <TableHead className="w-[38%]">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
              >
                Facility
                <SortIcon column="name" />
              </button>
            </TableHead>
            <TableHead className="w-[30%]">
              <button
                onClick={() => handleSort("address")}
                className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
              >
                Address
                <SortIcon column="address" />
              </button>
            </TableHead>
            <TableHead className="w-[16%]">
              <button
                onClick={() => handleSort("date")}
                className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
              >
                Created At
                <SortIcon column="date" />
              </button>
            </TableHead>
            <TableHead className="w-[16%] text-right font-semibold pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody
          className={cn(
            "divide-y",
            bodyMaxHeightClassName && "overflow-y-auto block",
            bodyMaxHeightClassName
          )}
        >
          {hasItems ? (
            sortedItems.map((row) => (
              <TableRow key={row.id} className="hover:bg-[var(--kma-selected)]">
                {/* Facility + status */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--kma-subtle)] text-[var(--kma-muted)]">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="flex">
                      <span className="font-semibold">{row.name}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Address + city */}
                <TableCell className="text-[var(--kma-muted)]">
                  {row.address || row.city
                    ? [row.address, row.city].filter(Boolean).join(" · ")
                    : "—"}
                </TableCell>

                {/* Created at (formateado) */}
                <TableCell className="text-[var(--kma-muted)]">
                  {row.createdAt ? formatIsoToYmdHm(row.createdAt) : "—"}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <RowActionButton
                      icon={Pencil}
                      ariaLabel="Edit facility"
                      onClick={() => onEdit(row.id)}
                      size="md"
                      disabled={!isAdmin}
                      title={!isAdmin ? "Only administrators can edit facilities" : "Edit facility"}
                    />
                    {showArchived && onRestore ? (
                      <RowActionButton
                        icon={ArchiveRestore}
                        ariaLabel="Restore facility"
                        onClick={() => onRestore(row.id)}
                        size="md"
                        disabled={!isAdmin}
                        title={!isAdmin ? "Only administrators can restore facilities" : "Restore facility"}
                      />
                    ) : (
                      <>
                        <RowActionButton
                          icon={Archive}
                          ariaLabel="Archive facility"
                          onClick={() => onArchive(row.id)}
                          size="md"
                          disabled={!isAdmin}
                          title={!isAdmin ? "Only administrators can archive facilities" : "Archive facility"}
                        />
                        <RowActionButton
                          icon={Trash2}
                          ariaLabel="Delete facility"
                          onClick={() => onDelete(row.id)}
                          variant="danger"
                          size="md"
                          disabled={!isAdmin}
                          title={!isAdmin ? "Only administrators can delete facilities" : "Delete facility"}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4}>
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default FacilityTable;
