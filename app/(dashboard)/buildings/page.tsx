"use client";

import React, { useCallback, useMemo, useState } from "react";
import type { BuildingRowVM } from "@features/buildings/ui/BuildingsTable";
import PageHeader from "@shared/ui/page-header";
import BuildingsSearchCard from "@features/buildings/ui/BuildingsSearchCard";
import BuildingsTable from "@features/buildings/ui/BuildingsTable";

// MOCK visual-only
const MOCK_BUILDINGS: BuildingRowVM[] = [
  {
    id: "bld-1",
    name: "Main Office Building",
    address: "123 Business Ave, Downtown, NY 10001",
    createdAt: "2024-01-01",
  },
  {
    id: "bld-2",
    name: "Warehouse A",
    address: "456 Industrial Blvd, Industrial Park, NY 10002",
    createdAt: "2024-01-05",
  },
  {
    id: "bld-3",
    name: "Production Facility",
    address: "789 Manufacturing St, Factory District, NY 10003",
    createdAt: "2024-01-10",
  },
  {
    id: "bld-4",
    name: "Storage Unit B",
    address: "321 Storage Way, Logistics Center, NY 10004",
    createdAt: "2024-01-15",
  },
];

export default function BuildingsPage() {
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo<BuildingRowVM[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_BUILDINGS;
    return MOCK_BUILDINGS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.createdAt.toLowerCase().includes(q)
    );
  }, [query]);

  const handleCreate = useCallback(() => {}, []);

  const handleEdit = useCallback((id: string) => {}, []);

  const handleDelete = useCallback((id: string) => {}, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buildings Management"
        subtitle="Manage building locations for audits"
        verticalAlign="center"
        primaryAction={{
          label: "New Building",
          onClick: () => {},
        }}
      />
      <BuildingsSearchCard
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search buildings by Building name, Address, or Created..."
      >
        <BuildingsTable
          items={filtered}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </BuildingsSearchCard>
    </div>
  );
}
