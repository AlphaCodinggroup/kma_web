"use client";

import React from "react";
import { MoreVertical } from "lucide-react";
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

export type UserStatus = "active" | "inactive";

export interface UsersTableProps {
  items: UserSummary[];
  emptyMessage?: string;
  bodyMaxHeightClassName?: string;
  onOpenActions?: (userId: string) => void;
  className?: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onError: () => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  items,
  emptyMessage = "No users found",
  bodyMaxHeightClassName,
  onOpenActions,
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
                    -{/* <RolePill>{u.role}</RolePill> */}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="align-middle">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        aria-label="Open actions"
                        onClick={() => onOpenActions?.(u.id)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center",
                          "rounded-md hover:bg-muted/60 transition-colors"
                        )}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
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
