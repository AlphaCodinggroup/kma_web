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

export interface BuildingRowVM {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface BuildingsTableProps {
  items: BuildingRowVM[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  bodyMaxHeightClassName?: string | undefined;
  emptyMessage?: string | undefined;
  className?: string | undefined;
}

const BuildingsTable: React.FC<BuildingsTableProps> = ({
  items,
  onEdit,
  onDelete,
  bodyMaxHeightClassName,
  emptyMessage = "No buildings found",
  className,
}) => {
  const hasItems = items.length > 0;

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
            <TableHead className="w-[44%]">Building Name</TableHead>
            <TableHead className="w-[36%]">Address</TableHead>
            <TableHead className="w-[12%]">Created</TableHead>
            <TableHead className="w-[8%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody
          className={cn(
            "divide-y",
            bodyMaxHeightClassName ? "overflow-y-auto block" : ""
          )}
          style={bodyMaxHeightClassName ? { maxHeight: "unset" } : undefined}
        >
          {hasItems ? (
            items.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="font-medium">{row.name}</div>
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {row.address}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {row.createdAt}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => onEdit?.(row.id)}
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center ",
                        "bg-white transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
                      )}
                      aria-label="Edit building"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onDelete?.(row.id)}
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center ",
                        "bg-white transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
                      )}
                      aria-label="Delete building"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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

export default BuildingsTable;
