"use client";

import React from "react";
import { cn } from "@shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import { Pencil, Trash2 } from "lucide-react";

export type ProjectRowVM = {
  id: string;
  name: string;
  auditor: string;
  building: string;
  createdISO: string;
};

export interface ProjectsTableProps {
  items: ProjectRowVM[];
  onEdit?: ((id: string) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  emptyMessage?: string | undefined;
  className?: string | undefined;
}

export const ProjectsTable: React.FC<ProjectsTableProps> = ({
  items,
  onEdit,
  onDelete,
  emptyMessage = "No projects found",
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
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[46%] px-4 py-3 text-black">
              Project Name
            </TableHead>
            <TableHead className="w-[18%] px-4 py-3 text-black">
              Auditor
            </TableHead>
            <TableHead className="w-[22%] px-4 py-3 text-black">
              Building
            </TableHead>
            <TableHead className="w-[10%] px-4 py-3 text-black">
              Created
            </TableHead>
            <TableHead className="w-[4%] px-4 py-3 text-right text-black">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {hasItems ? (
            items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-4 py-4 text-black">
                  {row.name}
                </TableCell>
                <TableCell className="px-4 py-4 text-black">
                  {row.auditor}
                </TableCell>
                <TableCell className="px-4 py-4 text-black">
                  {row.building}
                </TableCell>
                <TableCell className="px-4 py-4 text-black">
                  {row.createdISO}
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      aria-label="Edit project"
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                        "border border-gray-300 bg-white text-black",
                        "transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-black/30"
                      )}
                      onClick={() => onEdit?.(row.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete project"
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                        "border border-gray-300 bg-white text-black",
                        "transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-black/30"
                      )}
                      onClick={() => onDelete?.(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-4 py-10 text-center text-sm text-gray-600"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
