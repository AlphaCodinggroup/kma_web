"use client";

import React from "react";
import { Pencil, Trash2, MapPin } from "lucide-react";
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

export interface FacilityTableProps {
  items: Facility[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  bodyMaxHeightClassName?: string | undefined;
  emptyMessage?: string | undefined;
  className?: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onError: () => void;
}

const FacilityTable: React.FC<FacilityTableProps> = ({
  items,
  onEdit,
  onDelete,
  bodyMaxHeightClassName,
  emptyMessage = "No facilities found",
  className,
  isLoading = false,
  isError = false,
  onError,
}) => {
  const hasItems = items.length > 0;

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
            <TableHead className="w-[44%]">Facility</TableHead>
            <TableHead className="w-[36%]">Address</TableHead>
            <TableHead className="w-[12%]">Created</TableHead>
            <TableHead className="w-[8%] text-right">Actions</TableHead>
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
            items.map((row) => (
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
                      onClick={() => onEdit?.(row.id)}
                      size="md"
                    />

                    <RowActionButton
                      icon={Trash2}
                      ariaLabel="Delete facility"
                      onClick={() => onDelete?.(row.id)}
                      variant="danger"
                      size="md"
                    />
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
