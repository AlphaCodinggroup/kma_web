"use client";

import React, { useCallback, useMemo, useState } from "react";
import PageHeader from "@shared/ui/page-header";
import BuildingsSearchCard from "@features/facilities/ui/BuildingsSearchCard";
import BuildingsTable from "@features/facilities/ui/BuildingsTable";
import { useFacilitiesQuery } from "@features/facilities/ui/hooks/useFacilitiesQuery";
import type { Facility } from "@entities/facility/model";

export default function BuildingsPage() {
  const [query, setQuery] = useState<string>("");

  const { data, isLoading, isError, refetch } = useFacilitiesQuery();

  const facilities = useMemo<Facility[]>(() => data?.items ?? [], [data]);

  const filtered = useMemo<Facility[]>(() => {
    const src = facilities;
    const q = query.trim().toLowerCase();
    if (!q) return src;

    return src.filter((f) =>
      [f.name, f.address ?? "", f.createdAt]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [facilities, query]);

  const handleCreate = useCallback(() => {}, []);

  const handleEdit = useCallback((id: string) => {}, []);

  const handleDelete = useCallback((id: string) => {}, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities Management"
        subtitle="Manage facility locations for audits"
        verticalAlign="center"
        primaryAction={{
          label: "New Facility",
          onClick: () => {},
        }}
      />
      <BuildingsSearchCard
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search facility by name, Address, or Created..."
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
