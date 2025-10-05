"use client";

import * as React from "react";
import PageHeader from "@shared/ui/page-header";
import { FlowSection } from "@features/flows/ui/FlowSection";
import type { FlowItemVM } from "@features/flows/ui/FlowSection";
import SearchInput from "@shared/ui/search-input";

const MOCK_ITEMS: FlowItemVM[] = [
  {
    id: "flow-fire",
    title: "Fire Safety Audit Flow",
    description: "Comprehensive fire safety inspection checklist",
    questionsCount: 25,
  },
  {
    id: "flow-electrical",
    title: "Electrical Safety Flow",
    description: "Electrical systems and safety compliance check",
    questionsCount: 18,
  },
  {
    id: "flow-hvac",
    title: "HVAC System Flow",
    description: "Heating, ventilation, and air conditioning inspection",
    questionsCount: 22,
  },
  {
    id: "flow-building",
    title: "General Building Safety Flow",
    description: "Overall building safety and structural integrity",
    questionsCount: 30,
  },
];

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
    if (!q) return MOCK_ITEMS;
    return MOCK_ITEMS.filter(
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

      <FlowSection items={filtered} />
    </main>
  );
}
