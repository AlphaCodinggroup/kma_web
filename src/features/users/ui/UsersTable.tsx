"use client";

import React, { useState, useMemo } from "react";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@shared/lib/cn";
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
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 text-black" />;
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4 text-black" />;
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  const hasItems = sortedItems.length > 0;

  if (isLoading) return <Loading text="Loading users…" />;

  if (isError)
    return (
      <Retry text="Failed to load users. Please try again." onClick={onError} />
    );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white",
        className
      )}
    >
      <div className={cn("overflow-y-auto", bodyMaxHeightClassName)}>
        <Table className="min-w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-muted/40">
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort("username")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Username
                  <SortIcon column="username" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Name
                  <SortIcon column="name" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("email")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Email Address
                  <SortIcon column="email" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("role")}
                  className="flex items-center gap-2 hover:text-black transition-colors font-semibold"
                >
                  Role
                  <SortIcon column="role" />
                </button>
              </TableHead>
              <TableHead className=" text-right font-semibold pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasItems ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  {/* Username */}
                  <TableCell className="align-middle truncate">
                    {u.id ?? "-"}
                  </TableCell>

                  {/* Name */}
                  <TableCell className="align-middle truncate">
                    {u.name ?? "-"}
                  </TableCell>

                  {/* Email */}
                  <TableCell className="align-middle truncate">
                    {u.email ?? "-"}
                  </TableCell>

                  {/* Role */}
                  <TableCell className="align-middle">
                    {u.role && <RolePill>{u.role}</RolePill>}
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
      "inline-flex items-center rounded-full border",
      "px-2.5 py-1 text-xs",
      "bg-white border-muted-foreground/20 text-foreground/80"
    )}
  >
    {children}
  </span>
);

export default UsersTable;
