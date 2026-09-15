"use client";

import React, { useState, useMemo } from "react";
import { Pencil, Trash2, MapPin, Archive, ArchiveRestore, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 text-black" />;
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4 text-black" />;
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
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

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200",
        className
      )}
    >
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="[&_th]:h-12">
            <TableHead className="w-[44%]">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
              >
                Facility
                <SortIcon column="name" />
              </button>
            </TableHead>
            <TableHead className="w-[36%]">
              <button
                onClick={() => handleSort("address")}
                className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
              >
                Address
                <SortIcon column="address" />
              </button>
            </TableHead>
            <TableHead className="w-[12%]">
              <button
                onClick={() => handleSort("date")}
                className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
              >
                Created At
                <SortIcon column="date" />
              </button>
            </TableHead>
            <TableHead className="w-[8%] text-right font-semibold pr-4">Actions</TableHead>
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
              <TableRow key={row.id} className="hover:bg-muted/30">
                {/* Facility + status */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="flex">
                      <span className="font-medium">{row.name}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Address + city */}
                <TableCell className="text-muted-foreground">
                  {row.address || row.city
                    ? [row.address, row.city].filter(Boolean).join(" · ")
                    : "—"}
                </TableCell>

                {/* Created at (formateado) */}
                <TableCell className="text-muted-foreground">
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
