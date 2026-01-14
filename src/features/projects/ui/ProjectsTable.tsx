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
import { Pencil, Trash2, Archive, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import RowActionButton from "@shared/ui/row-action-button";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import type { Project } from "@entities/projects/model";
import { formatIsoToYmdHm } from "@shared/lib/date";
import { ProjectStatusBadge } from "@shared/ui/badge";

export type SortField = "name" | "auditor" | "facility" | "status" | "createdAt";
export type SortOrder = "asc" | "desc" | null;

export interface ProjectsTableProps {
  items: Project[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  emptyMessage?: string | undefined;
  className?: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onError: () => void;
  sortField?: SortField | null;
  sortOrder?: SortOrder;
  onSort?: (field: SortField) => void;
}

export const ProjectsTable: React.FC<ProjectsTableProps> = ({
  items,
  onEdit,
  onDelete,
  onArchive,
  emptyMessage = "No projects found",
  className,
  isLoading = false,
  isError = false,
  onError,
  sortField,
  sortOrder,
  onSort,
}) => {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-30" />;
    if (sortOrder === "asc") return <ArrowUp className="h-4 w-4" />;
    if (sortOrder === "desc") return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4 opacity-30" />;
  };
  const hasItems = items.length > 0;

  if (isLoading) return <Loading text="Loading projects…" />;

  if (isError)
    return (
      <Retry
        text="Failed to load projects. Please try again."
        onClick={onError}
      />
    );

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
            <TableHead className="w-[30%] px-4 py-3 text-black">
              <button
                onClick={() => onSort?.("name")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Project
                {onSort && getSortIcon("name")}
              </button>
            </TableHead>
            <TableHead className="w-[20%] px-4 py-3 text-black">
              <button
                onClick={() => onSort?.("auditor")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Auditor
                {onSort && getSortIcon("auditor")}
              </button>
            </TableHead>
            <TableHead className="w-[25%] px-4 py-3 text-black">
              <button
                onClick={() => onSort?.("facility")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Facility
                {onSort && getSortIcon("facility")}
              </button>
            </TableHead>
            <TableHead className="w-[5%] px-4 py-3 text-black">
              <button
                onClick={() => onSort?.("status")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Status
                {onSort && getSortIcon("status")}
              </button>
            </TableHead>
            <TableHead className="w-[15%] px-4 py-3 text-black">
              <button
                onClick={() => onSort?.("createdAt")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Created At
                {onSort && getSortIcon("createdAt")}
              </button>
            </TableHead>
            <TableHead className="w-[7%] px-4 py-3 text-black">
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
                  {row.users?.length ? (
                    <div className="flex flex-col gap-1">
                      {row.users.map((user, i) => (
                        <span key={i} className="text-sm">
                          {user.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell className="px-4 py-4 text-black">
                  {row.facilities?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.facilities.map((facility, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                        >
                          {facility.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell className="px-4 py-4 text-black">
                  {row.status ? (
                    <ProjectStatusBadge status={row.status} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="px-4 py-4 text-black">
                  {formatIsoToYmdHm(row.createdAt) ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <RowActionButton
                      icon={Pencil}
                      ariaLabel="Edit project"
                      onClick={() => onEdit(row.id)}
                      size="md"
                    />
                    {/* <RowActionButton
                      icon={Archive}
                      ariaLabel="Archive project"
                      onClick={() => onArchive(row.id)}
                      size="md"
                    /> */}
                    <RowActionButton
                      icon={Trash2}
                      ariaLabel="Delete project"
                      onClick={() => onDelete(row.id)}
                      variant="danger"
                      size="md"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
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
