"use client";

import React from "react";
import PageHeader from "@shared/ui/page-header";
import {
  FlowsSection,
  type FlowItemVM,
} from "@features/flows/ui/FlowSection";
import SearchInput from "@shared/ui/search-input";
import { useFlowsQuery } from "@features/flows/lib/useFlowsQuery";

export default function FlowsPage() {
  const [search, setSearch] = React.useState<string>("");
  const { data, isLoading, error } = useFlowsQuery(true);

  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const flows: FlowItemVM[] = React.useMemo(() => {
    if (!data?.flows) return [];
    return data.flows.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description ?? "",
      questionsCount: f.steps.filter(
        (s) => s.type === "Question" || s.type === "Select"
      ).length,
      flowId: f.id,
    }));
  }, [data]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flows;
    return flows.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false)
    );
  }, [search, flows]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-sm z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        Error loading flows: {error.message}
      </div>
    );
  }

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

      <FlowsSection items={filtered} />
    </main>
  );
}
