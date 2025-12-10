"use client";

import React from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  const hasItems = items.length > 0;

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
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className=" text-right">Actions</TableHead>
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
              items.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  {/* User */}
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
                      />
                      <RowActionButton
                        icon={Trash2}
                        ariaLabel="Delete user"
                        variant="danger"
                        onClick={() => onDelete?.(u.id)}
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
