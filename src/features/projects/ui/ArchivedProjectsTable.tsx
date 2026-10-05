"use client";

import React from "react";
import Link from "next/link";
import { Eye, RotateCcw } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { projectDetailHref } from "@features/projects/lib/project-href";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import RowActionButton from "@shared/ui/row-action-button";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import type { Project } from "@entities/projects/model";
import { formatIsoToYmdHm } from "@shared/lib/date";
import { useSession } from "@processes/auth/hooks";
import ProjectAuditsProgress from "@features/projects/ui/ProjectAuditsProgress";

export interface ArchivedProjectsTableProps {
  items: Project[];
  onRestore: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  onError: () => void;
  emptyMessage?: string | undefined;
  className?: string | undefined;
}

/**
 * Tabla de proyectos archivados: proyecto, fecha de archivado, auditorías
 * completadas/total y las acciones Ver y Restaurar.
 */
export const ArchivedProjectsTable: React.FC<ArchivedProjectsTableProps> = ({
  items,
  onRestore,
  isLoading,
  isError,
  onError,
  emptyMessage = "No archived projects",
  className,
}) => {
  const { isAdmin } = useSession();

  if (isLoading) return <Loading text="Loading archived projects…" />;

  if (isError)
    return (
      <Retry
        text="Failed to load archived projects. Please try again."
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
            <TableHead className="w-[40%] px-4 py-3 font-semibold text-black">
              Project
            </TableHead>
            <TableHead className="w-[20%] px-4 py-3 font-semibold text-black">
              Archived
            </TableHead>
            <TableHead className="w-[20%] px-4 py-3 font-semibold text-black">
              Audits
            </TableHead>
            <TableHead className="w-[20%] px-4 py-3 text-black">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length > 0 ? (
            items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-4 py-4 text-black">
                  <Link
                    href={projectDetailHref(row.id)}
                    className="font-semibold text-black no-underline hover:underline"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-4 text-black">
                  {formatIsoToYmdHm(row.archivedAt).slice(0, 10)}
                </TableCell>
                <TableCell className="px-4 py-4 text-black">
                  <ProjectAuditsProgress projectId={row.id} />
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={projectDetailHref(row.id)}
                      aria-label={`View ${row.name}`}
                      title="View project"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--kma-border)] bg-white text-black hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <RowActionButton
                      icon={RotateCcw}
                      ariaLabel="Restore project"
                      onClick={() => onRestore(row.id)}
                      size="md"
                      disabled={!isAdmin}
                      title={
                        !isAdmin
                          ? "Only administrators can restore projects"
                          : "Restore project"
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
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

export default ArchivedProjectsTable;
