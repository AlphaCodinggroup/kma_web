"use client";

import React, { useCallback, useMemo, useState } from "react";
import UsersMetrics from "@features/users/ui/UsersMetrics";
import UsersSearchCard from "@features/users/ui/UsersSearchCard";
import UsersTable, { type UserRowVM } from "@features/users/ui/UsersTable";
import PageHeader from "@shared/ui/page-header";
import { cn } from "@shared/lib/cn";

const metrics = {
  totalUsers: 4,
  auditors: 2,
  qcManagers: 1,
  projectManagers: 1,
};

const ITEMS: UserRowVM[] = [
  {
    id: "USR-001",
    name: "John Perez",
    email: "john@company.com",
    role: "Project Manager",
    status: "active",
    lastLogin: "2024-01-10",
    auditsCount: 15,
  },
  {
    id: "USR-002",
    name: "Maria Garcia",
    email: "maria@company.com",
    role: "Auditor",
    status: "active",
    lastLogin: "2024-01-09",
    auditsCount: 23,
  },
  {
    id: "USR-003",
    name: "Carlos Lopez",
    email: "carlos@company.com",
    role: "QC Manager",
    status: "active",
    lastLogin: "2024-01-08",
    auditsCount: 8,
  },
  {
    id: "USR-004",
    name: "Ana Martin",
    email: "ana@company.com",
    role: "Auditor",
    status: "inactive",
    lastLogin: "2024-01-05",
    auditsCount: 12,
  },
];

const UsersPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo<UserRowVM[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.status.toLowerCase().includes(q)
    );
  }, [query]);

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
        total={ITEMS.length}
      >
        <UsersTable
          items={filtered}
          onOpenActions={handleOpenActions}
          bodyMaxHeightClassName="max-h-[540px]"
        />
      </UsersSearchCard>
    </div>
  );
};

export default UsersPage;
