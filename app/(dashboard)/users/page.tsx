"use client";

import React, { useCallback, useMemo, useState } from "react";
import UsersMetrics from "@features/users/ui/UsersMetrics";
import UsersSearchCard from "@features/users/ui/UsersSearchCard";
import UsersTable from "@features/users/ui/UsersTable";
import CreateUserDialog, {
  type CreateUserValues,
} from "@features/users/ui/CreateUserDialog";
import { usersRepoImpl } from "@features/users/api/users.repo.impl";
import PageHeader from "@shared/ui/page-header";
import { cn } from "@shared/lib/cn";
import { useUsersQuery } from "@features/users/ui/hooks/useUsersQuery";
import type { UserSummary } from "@entities/user/list.model";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@shared/ui/modal";
import { Button } from "@shared/ui/controls";
import { CheckCircle2 } from "lucide-react";
import ConfirmDialog from "@shared/ui/confirm-dialog";

type CreateState = {
  loading: boolean;
  error: string | null;
  success: boolean;
};

const UsersPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [createState, setCreateState] = useState<CreateState>({
    loading: false,
    error: null,
    success: false,
  });

  const { data, isLoading, isError, refetch } = useUsersQuery();

  const users = useMemo<UserSummary[]>(() => data?.items ?? [], [data]);

  const filtered = useMemo<UserSummary[]>(() => {
    const q = query.trim().toLowerCase();

    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [data, query]);

  const metrics = useMemo(
    () => ({
      totalUsers: users.length,
      auditors: users.filter((u) => u.role === "auditor").length,
      qcManagers: users.filter((u) => u.role === "qc_manager").length,
      projectManagers: users.filter((u) => u.role === "admin").length,
    }),
    [users.length]
  );

  const handleEdit = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setEditingUser(user);
        setCreateState({ loading: false, error: null, success: false });
        setIsCreateDialogOpen(true);
      }
    },
    [users]
  );

  const handleDelete = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setDeletingUser(user);
      }
    },
    [users]
  );

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await usersRepoImpl.deleteUser(deletingUser.id);
      setIsDeleting(false);
      setDeletingUser(null);
      await refetch();
    } catch (err: any) {
      console.error("Failed to delete user", err);
      setIsDeleting(false);
      // Optional: show error toast or alert, for now just log
    }
  };

  const handleCreateUser = useCallback(
    async (values: CreateUserValues) => {
      setCreateState((s) => ({ ...s, loading: true, error: null }));
      try {
        if (editingUser) {
          await usersRepoImpl.updateUser(editingUser.id, {
            name: values.name,
            email: values.email,
            role: values.role,
            ...(values.password ? { password: values.password } : {}),
          });
        } else {
          await usersRepoImpl.createUser(values);
        }

        // Success
        setCreateState({ loading: false, error: null, success: true });
        setIsCreateDialogOpen(false); // Close form
        // setEditingUser(null); // Maintained for success message
        await refetch();
      } catch (err: any) {
        console.error("Failed to save user", err);
        const msg = err?.message || "Failed to save user. Please try again.";
        setCreateState((s) => ({ ...s, loading: false, error: msg }));
      }
    },
    [refetch, editingUser]
  );

  const handleCloseSuccess = () => {
    setCreateState((s) => ({ ...s, success: false }));
    setEditingUser(null);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) setEditingUser(null);
  };

  return (
    <div className={cn("space-y-4")}>
      <PageHeader
        title="User Management"
        subtitle="Manage users, roles and system permissions"
        verticalAlign="center"
        primaryAction={{
          label: "Add User",
          onClick: () => {
            setCreateState({ loading: false, error: null, success: false });
            setIsCreateDialogOpen(true);
          },
        }}
      />

      {/* Métricas */}
      <UsersMetrics metrics={metrics} />

      <UsersSearchCard
        query={query}
        onQueryChange={setQuery}
        total={metrics.totalUsers}
      >
        <UsersTable
          items={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
          bodyMaxHeightClassName="max-h-[540px]"
          isError={isError}
          isLoading={isLoading}
          onError={refetch}
        />
      </UsersSearchCard>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={handleCreateUser}
        loading={createState.loading}
        error={createState.error}
        {...(editingUser
          ? {
            defaultValues: {
              name: editingUser.name,
              email: editingUser.email,
              role: editingUser.role,
            },
          }
          : {})}
      />

      {/* Success Modal */}
      <Modal open={createState.success} onOpenChange={(open) => !open && handleCloseSuccess()}>
        <ModalContent className="max-w-sm text-center p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>

            <ModalHeader className="mb-2">
              <ModalTitle className="text-xl">
                {editingUser ? "User Updated" : "User Created"}
              </ModalTitle>
              <ModalDescription className="text-center">
                The user has been successfully {editingUser ? "updated" : "added"}.
              </ModalDescription>
            </ModalHeader>

            <ModalFooter className="w-full justify-center mt-6">
              <Button onClick={handleCloseSuccess} className="w-full">
                Close
              </Button>
            </ModalFooter>
          </div>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete User"
        description={
          <>
            Are you sure you want to delete <strong>{deletingUser?.name}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete User"
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};

export default UsersPage;
