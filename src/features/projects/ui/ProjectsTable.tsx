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
import { Pencil, Trash2, Archive } from "lucide-react";
import RowActionButton from "@shared/ui/row-action-button";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import type { Project } from "@entities/projects/model";
import { formatIsoToYmdHm } from "@shared/lib/date";
import { ProjectStatusBadge } from "@shared/ui/badge";

export interface ProjectsTableProps {
  items: Project[];
  onEdit?: ((id: string) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  emptyMessage?: string | undefined;
  className?: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onError: () => void;
}

export const ProjectsTable: React.FC<ProjectsTableProps> = ({
  items,
  onEdit,
  onDelete,
  emptyMessage = "No projects found",
  className,
  isLoading = false,
  isError = false,
  onError,
}) => {
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
            <TableHead className="w-[45%] px-4 py-3 text-black">
              Project Name
            </TableHead>
            <TableHead className="w-[20%] px-4 py-3 text-black">
              Auditors
            </TableHead>
            <TableHead className="w-[23%] px-4 py-3 text-black">
              Facilities
            </TableHead>
            <TableHead className="w-[5%] px-4 py-3 text-black">
              Status
            </TableHead>
            <TableHead className="w-[10%] px-4 py-3 text-black">
              Created At
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
                      {row.users.map((user) => (
                        <span
                          key={user.id}
                          className="text-sm border rounded-xl text-center"
                        >
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
                    <div className="flex flex-col gap-1">
                      {row.facilities.map((facility) => (
                        <span
                          key={facility.id}
                          className="text-sm border rounded-2xl text-center"
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
                      onClick={() => onEdit?.(row.id)}
                      size="md"
                    />
                    <RowActionButton
                      icon={Archive}
                      ariaLabel="Archive project"
                      onClick={() => onDelete?.(row.id)}
                      size="md"
                    />
                    <RowActionButton
                      icon={Trash2}
                      ariaLabel="Delete project"
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
