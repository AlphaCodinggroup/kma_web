"use client";

import React from "react";
import Link from "next/link";
import { Eye, RotateCcw } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { useMediaQuery } from "@shared/lib/useMediaQuery";
import { MobileEntityRow } from "@shared/ui/mobile-entity-row";
import { Button } from "@shared/ui/controls";
import { ProjectStatusBadge } from "@shared/ui/badge";
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
  const isCompact = useMediaQuery("(max-width: 1023px)");

  if (isLoading) return <Loading text="Loading archived projects…" />;

  if (isError)
    return (
      <Retry
        text="Failed to load archived projects. Please try again."
        onClick={onError}
      />
    );

  if (isCompact) return (
    <div className={className}>
      {items.length ? <ul aria-label="Archived projects" className="divide-y divide-[var(--kma-border)]">
        {items.map(row => <MobileEntityRow key={row.id} title={<Link href={projectDetailHref(row.id)} className="no-underline hover:underline">{row.name}</Link>} status={<ProjectStatusBadge status="ARCHIVED" />} subtitle={`Archived ${formatIsoToYmdHm(row.archivedAt).slice(0, 10)}`} actions={<>
          <Link href={projectDetailHref(row.id)} aria-label={`View ${row.name}`} className="inline-flex min-h-11 items-center rounded border border-[var(--kma-border)] px-3 text-sm font-medium no-underline">View project</Link>
          <Button fullWidth={false} variant="secondary" disabled={!isAdmin} aria-label="Restore project" onClick={() => onRestore(row.id)}>Restore</Button>
        </>}><ProjectAuditsProgress projectId={row.id} /></MobileEntityRow>)}
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
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40%] px-4 py-3 font-semibold text-[var(--kma-fg)]">
              Project
            </TableHead>
            <TableHead className="w-[20%] px-4 py-3 font-semibold text-[var(--kma-fg)]">
              Archived
            </TableHead>
            <TableHead className="w-[20%] px-4 py-3 font-semibold text-[var(--kma-fg)]">
              Audits
            </TableHead>
            <TableHead className="w-[20%] px-5 py-3 text-[var(--kma-muted)]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length > 0 ? (
            items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  <Link
                    href={projectDetailHref(row.id)}
                    className="font-semibold text-[var(--kma-fg)] no-underline hover:underline"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  {formatIsoToYmdHm(row.archivedAt).slice(0, 10)}
                </TableCell>
                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  <ProjectAuditsProgress projectId={row.id} />
                </TableCell>
                <TableCell className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={projectDetailHref(row.id)}
                      aria-label={`View ${row.name}`}
                      title="View project"
                      className="inline-flex h-11 w-11 items-center justify-center rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] text-[var(--kma-fg)] hover:bg-[var(--kma-subtle)]"
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
                className="px-4 py-10 text-center text-sm text-[var(--kma-muted)]"
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
