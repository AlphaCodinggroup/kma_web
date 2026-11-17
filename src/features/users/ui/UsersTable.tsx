"use client";

import React, { useState, useMemo } from "react";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import type { UserSummary } from "@entities/user/list.model";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import RowActionButton from "@shared/ui/row-action-button";
import { useSession } from "@processes/auth/hooks";

export type UserStatus = "active" | "inactive";

export interface UsersTableProps {
  items: UserSummary[];
  emptyMessage?: string;
  bodyMaxHeightClassName?: string;
  onEdit?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  className?: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onError: () => void;
}

type SortColumn = "username" | "name" | "email" | "role";
type SortDirection = "asc" | "desc" | null;

export const UsersTable: React.FC<UsersTableProps> = ({
  items,
  emptyMessage = "No users found",
  bodyMaxHeightClassName,
  onEdit,
  onDelete,
  className,
  isLoading = false,
  isError = false,
  onError,
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
        case "username":
          aVal = (a.id || "").toLowerCase();
          bVal = (b.id || "").toLowerCase();
          break;
        case "name":
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
          break;
        case "email":
          aVal = (a.email || "").toLowerCase();
          bVal = (b.email || "").toLowerCase();
          break;
        case "role":
          aVal = (a.role || "").toLowerCase();
          bVal = (b.role || "").toLowerCase();
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

  if (isLoading) return <Loading text="Loading users…" />;

  if (isError)
    return (
      <Retry text="Failed to load users. Please try again." onClick={onError} />
    );

  if (isCompact) return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--kma-border)] px-4 py-3">
        <select aria-label="Sort users" value={sortColumn ?? ""} onChange={event => { if (event.target.value) handleSort(event.target.value as SortColumn); else { setSortColumn(null); setSortDirection(null); } }} className="min-h-11 min-w-0 flex-1 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 text-sm"><option value="">Original order</option><option value="name">Name</option><option value="email">Email address</option><option value="role">Role</option><option value="username">Username</option></select>
        <Button fullWidth={false} variant="ghost" aria-label="Change user sort direction" onClick={() => handleSort(sortColumn ?? "name")}>{sortDirection === "asc" ? "Ascending" : sortDirection === "desc" ? "Descending" : "Sort"}</Button>
      </div>
      {hasItems ? <ul aria-label="Users" className="divide-y divide-[var(--kma-border)]">
        {sortedItems.map(user => <MobileEntityRow key={user.id} title={user.name} subtitle={user.email} status={<RolePill>{user.role}</RolePill>} actions={<>
          <Button fullWidth={false} variant="secondary" disabled={!isAdmin} aria-label="Edit user" onClick={() => onEdit?.(user.id)}>Edit</Button>
          <RowActionButton className="min-h-11 min-w-11" icon={Trash2} ariaLabel="Delete user" variant="danger" disabled={!isAdmin} onClick={() => onDelete?.(user.id)} />
        </>}><dl><dt className="font-medium text-[var(--kma-fg)]">Username</dt><dd className="break-words [overflow-wrap:anywhere]">{user.id}</dd></dl></MobileEntityRow>)}
      </ul> : <p className="px-4 py-10 text-center text-sm text-[var(--kma-muted)]">{emptyMessage}</p>}
    </div>
  );

  return (
    <div
      className={cn(
        "overflow-x-auto bg-[var(--kma-surface)]",
        className
      )}
    >
      <div className={cn("overflow-y-auto", bodyMaxHeightClassName)}>
        <Table className="min-w-[760px] ">
          <TableHeader className="sticky top-0 z-10 bg-[var(--kma-subtle)]">
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Name
                  <SortIcon column="name" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("email")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Email Address
                  <SortIcon column="email" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("role")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Role
                  <SortIcon column="role" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("username")}
                  className="flex items-center gap-2 hover:text-[var(--kma-fg)] transition-colors font-semibold"
                >
                  Username
                  <SortIcon column="username" />
                </button>
              </TableHead>
              <TableHead className=" text-right font-semibold pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-28 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((u) => (
                <TableRow key={u.id} className="hover:bg-[var(--kma-selected)]">
                  {/* Username */}
                  <TableCell className="align-middle max-w-[230px] truncate font-semibold">
                    {u.name ?? "-"}
                  </TableCell>

                  {/* Name */}
                  <TableCell className="align-middle max-w-[230px] truncate">
                    {u.email ?? "-"}
                  </TableCell>

                  {/* Email */}
                  <TableCell className="align-middle">
                    {u.role && <RolePill>{u.role}</RolePill>}
                  </TableCell>

                  {/* Role */}
                  <TableCell title={u.id} className="align-middle max-w-[200px] truncate text-xs text-[var(--kma-muted)]">
                    {u.id ?? "-"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="align-middle">
                    <div className="flex justify-end gap-2">
                      <RowActionButton
                        icon={Pencil}
                        ariaLabel="Edit user"
                        onClick={() => onEdit?.(u.id)}
                        disabled={!isAdmin}
                        title={!isAdmin ? "Only administrators can edit users" : "Edit user"}
                      />
                      <RowActionButton
                        icon={Trash2}
                        ariaLabel="Delete user"
                        variant="danger"
                        onClick={() => onDelete?.(u.id)}
                        disabled={!isAdmin}
                        title={!isAdmin ? "Only administrators can delete users" : "Delete user"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

/* ---------------------------------- UI bits --------------------------------- */

const RolePill: React.FC<React.PropsWithChildren> = ({ children }) => (
  <span
    className={cn(
      "inline-flex items-center rounded border",
      "px-2.5 py-1 text-xs",
      "bg-[var(--kma-subtle)] border-[var(--kma-border)] text-[var(--kma-fg)]"
    )}
  >
    {{ auditor: "Auditor", qc: "QC Manager", admin: "Administrator" }[String(children)] ?? children}
  </span>
);

export default UsersTable;
