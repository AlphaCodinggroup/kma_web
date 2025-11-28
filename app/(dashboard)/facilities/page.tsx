"use client";

import React, { useCallback, useMemo, useState } from "react";
import PageHeader from "@shared/ui/page-header";
import FacilitySearchCard from "@features/facilities/ui/FacilitySearchCard";
import { useFacilitiesQuery } from "@features/facilities/ui/hooks/useFacilitiesQuery";
import type { Facility } from "@entities/facility/model";
import FacilityTable from "@features/facilities/ui/FacilityTable";

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
      <FacilitySearchCard
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search facility by name, Address, or Created..."
      >
        <FacilityTable
          items={filtered}
          onEdit={() => {}}
          onDelete={() => {}}
          isError={isError}
          isLoading={isLoading}
          onError={refetch}
        />
      </FacilitySearchCard>
    </div>
  );
}
