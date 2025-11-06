"use client";

import React from "react";
import PageHeader from "@shared/ui/page-header";
import {
  DUMMY_FLOWS_SECTION_ITEMS,
  FlowsSection,
} from "@features/flows/ui/FlowSection";
import SearchInput from "@shared/ui/search-input";

export default function FlowsPage() {
  const [search, setSearch] = React.useState<string>("");

  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  // Filtro solo visual (client). Más adelante se reemplaza por query a la API.
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DUMMY_FLOWS_SECTION_ITEMS;
    return DUMMY_FLOWS_SECTION_ITEMS.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false)
    );
  }, [search]);

  return (
    <main className="flex w-full flex-col gap-6">
      <PageHeader
        title="Audit Flows"
        subtitle="View all audit flow templates used in the system"
      />

      <div className="max-w-full">
        <SearchInput
          placeholder="Search flows..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <FlowsSection items={DUMMY_FLOWS_SECTION_ITEMS} />
    </main>
  );
}
