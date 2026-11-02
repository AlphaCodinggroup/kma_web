"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@shared/lib/cn";
import { useMediaQuery } from "@shared/lib/useMediaQuery";
import { MobileEntityRow } from "@shared/ui/mobile-entity-row";
import { Button } from "@shared/ui/controls";
import { projectDetailHref } from "@features/projects/lib/project-href";
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
import { useSession } from "@processes/auth/hooks";

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
  onResetSort?: () => void;
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
  onResetSort,
}) => {
  const { isAdmin } = useSession();
  const isCompact = useMediaQuery("(max-width: 1023px)");
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

  if (isCompact) return (
    <div className={className}>
      {onSort ? <div className="flex flex-wrap items-center gap-2 border-b border-[var(--kma-border)] px-4 py-3">
        <select aria-label="Sort projects" value={sortField ?? ""} onChange={event => { if (event.target.value) onSort(event.target.value as SortField); else onResetSort?.(); }} className="min-h-11 min-w-0 flex-1 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 text-sm">
          <option value="">Original order</option><option value="name">Project name</option><option value="auditor">Auditor</option><option value="facility">Facility</option><option value="status">Status</option><option value="createdAt">Created date</option>
        </select>
        <Button fullWidth={false} variant="ghost" aria-label="Change project sort direction" onClick={() => onSort(sortField ?? "name")}>{sortOrder === "asc" ? "Ascending" : sortOrder === "desc" ? "Descending" : "Sort"}</Button>
      </div> : null}
      {hasItems ? <ul aria-label="Projects" className="divide-y divide-[var(--kma-border)]">
        {items.map(row => <MobileEntityRow key={row.id} title={<Link href={projectDetailHref(row.id)} className="no-underline hover:underline">{row.name}</Link>} status={<ProjectStatusBadge status={row.status} />} subtitle={row.users?.length ? row.users.map(user => user.name).join(", ") : "No auditors assigned"} actions={<>
          <Link href={projectDetailHref(row.id)} className="inline-flex min-h-11 items-center rounded border border-[var(--kma-border)] px-3 text-sm font-medium no-underline">View project</Link>
          <Button fullWidth={false} variant="secondary" disabled={!isAdmin} aria-label="Edit project" onClick={() => onEdit(row.id)}>Edit</Button>
          <RowActionButton className="min-h-11 min-w-11" icon={Archive} ariaLabel="Archive project" disabled={!isAdmin} onClick={() => onArchive(row.id)} />
          <RowActionButton className="min-h-11 min-w-11" icon={Trash2} ariaLabel="Delete project" variant="danger" disabled={!isAdmin} onClick={() => onDelete(row.id)} />
        </>}>
          <dl className="space-y-3"><div><dt className="font-medium text-[var(--kma-fg)]">Facilities</dt><dd>{row.facilities?.length ? row.facilities.map(facility => facility.name).join(", ") : "No facilities assigned"}</dd></div><div><dt className="font-medium text-[var(--kma-fg)]">Created</dt><dd>{formatIsoToYmdHm(row.createdAt) || "—"}</dd></div>{row.description ? <div><dt className="font-medium text-[var(--kma-fg)]">Description</dt><dd>{row.description}</dd></div> : null}</dl>
        </MobileEntityRow>)}
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
            <TableHead className="w-[24%] px-5 py-3 text-[var(--kma-muted)]">
              <button
                onClick={() => onSort?.("name")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Project
                {onSort && getSortIcon("name")}
              </button>
            </TableHead>
            <TableHead className="w-[20%] px-5 py-3 text-[var(--kma-muted)]">
              <button
                onClick={() => onSort?.("auditor")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Auditor
                {onSort && getSortIcon("auditor")}
              </button>
            </TableHead>
            <TableHead className="w-[25%] px-5 py-3 text-[var(--kma-muted)]">
              <button
                onClick={() => onSort?.("facility")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Facility
                {onSort && getSortIcon("facility")}
              </button>
            </TableHead>
            <TableHead className="w-[8%] px-5 py-3 text-[var(--kma-muted)]">
              <button
                onClick={() => onSort?.("status")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Status
                {onSort && getSortIcon("status")}
              </button>
            </TableHead>
            <TableHead className="w-[15%] px-5 py-3 text-[var(--kma-muted)]">
              <button
                onClick={() => onSort?.("createdAt")}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
                disabled={!onSort}
              >
                Created At
                {onSort && getSortIcon("createdAt")}
              </button>
            </TableHead>
            <TableHead className="w-[10%] px-5 py-3 text-[var(--kma-muted)]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {hasItems ? (
            items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  <Link
                    href={projectDetailHref(row.id)}
                    className="font-semibold text-[var(--kma-fg)] no-underline hover:underline"
                  >
                    {row.name}
                  </Link>
                  {row.description ? <p className="mt-1 max-w-[260px] truncate text-xs text-[var(--kma-muted)]" title={row.description}>{row.description}</p> : null}
                </TableCell>
                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  {row.users?.length ? (
                    <div className="flex flex-col gap-1 text-[var(--kma-muted)]">
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

                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  {row.facilities?.length ? (
                    <div className="flex flex-col gap-1.5">
                      {row.facilities.map((facility, i) => (
                        <span
                          key={i}
                          className="text-sm text-[var(--kma-muted)]"
                        >
                          {facility.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  {row.status ? (
                    <ProjectStatusBadge status={row.status} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="px-5 py-4 text-[var(--kma-fg)]">
                  {formatIsoToYmdHm(row.createdAt) ?? "—"}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <RowActionButton
                      icon={Pencil}
                      ariaLabel="Edit project"
                      onClick={() => onEdit(row.id)}
                      size="md"
                      disabled={!isAdmin}
                      title={!isAdmin ? "Only administrators can edit projects" : "Edit project"}
                    />
                    <RowActionButton
                      icon={Archive}
                      ariaLabel="Archive project"
                      onClick={() => onArchive(row.id)}
                      size="md"
                      disabled={!isAdmin}
                      title={!isAdmin ? "Only administrators can archive projects" : "Archive project"}
                    />
                    <RowActionButton
                      icon={Trash2}
                      ariaLabel="Delete project"
                      onClick={() => onDelete(row.id)}
                      variant="danger"
                      size="md"
                      disabled={!isAdmin}
                      title={!isAdmin ? "Only administrators can delete projects" : "Delete project"}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
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
