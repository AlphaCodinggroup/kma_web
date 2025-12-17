"use client";

import React from "react";
import PageHeader from "@shared/ui/page-header";
import { Button } from "@shared/ui/controls";
import { Plus } from "lucide-react";
import {
  FlowsSection,
  type FlowItemVM,
} from "@features/flows/ui/FlowSection";
import SearchInput from "@shared/ui/search-input";
import { useFlowsQuery } from "@features/flows/lib/useFlowsQuery";
import { Loading } from "@shared/ui/Loading";

import { useRouter } from "next/navigation";

export default function FlowsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState<string>("");
  const { data, isLoading, error } = useFlowsQuery(true);
  const [isNavigating, setIsNavigating] = React.useState(false);

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

  if (isLoading || isNavigating) return <Loading text={isNavigating ? "Navigating to create a new flow..." : "Loading flows…"} />;

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

      <div className="max-w-full flex items-center gap-4">
        <div className="flex-1">
          <SearchInput
            placeholder="Search flows..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <Button
          onClick={() => {
            setIsNavigating(true);
            router.push("/flows/new");
          }}
          className="bg-black text-white hover:bg-gray-800 shadow-md gap-2 !w-auto px-6"
        >
          <Plus className="h-4 w-4" />
          Create Flow
        </Button>
      </div>

      <FlowsSection items={filtered} />
    </main>
  );
}
