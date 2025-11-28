"use client";

import React, { useCallback, useMemo, useState } from "react";
import UsersMetrics from "@features/users/ui/UsersMetrics";
import UsersSearchCard from "@features/users/ui/UsersSearchCard";
import UsersTable from "@features/users/ui/UsersTable";
import PageHeader from "@shared/ui/page-header";
import { cn } from "@shared/lib/cn";
import { useUsersQuery } from "@features/users/ui/hooks/useUsersQuery";
import type { UserSummary } from "@entities/user/list.model";

const UsersPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");

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
      auditors: 0,
      qcManagers: 0,
      projectManagers: 0,
    }),
    [users.length]
  );

  const handleOpenActions = useCallback((id: string) => {}, []);

  return (
    <div className={cn("space-y-4")}>
      <PageHeader
        title="User Management"
        subtitle="Manage users, roles and system permissions"
        verticalAlign="center"
        primaryAction={{
          label: "Add User",
          onClick: () => {},
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
          onOpenActions={handleOpenActions}
          bodyMaxHeightClassName="max-h-[540px]"
          isError={isError}
          isLoading={isLoading}
          onError={refetch}
        />
      </UsersSearchCard>
    </div>
  );
};

export default UsersPage;
