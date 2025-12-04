"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

import ReportsSearchCard from "@features/reports/ui/ReportsSearchCard";
import ReportsListCard from "@features/reports/ui/ReportsListCard";
import { useReportsListQuery } from "@features/reports/lib/hooks/useReportsQuery";
import PageHeader from "@shared/ui/page-header";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import { cn } from "@shared/lib/cn";

const ReportsPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");

  // Debounce + normalización interna del hook
  const debouncedQuery = useDebouncedSearch(query);

  const { data, isLoading, isError, refetch } = useReportsListQuery();
  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = debouncedQuery;
    if (!q) return items;

    return items.filter((r) => {
      const fields = [
        r.id,
        r.flowId,
        r.userId ?? "",
        r.projectId ?? "",
        r.status,
        new Date(r.completedAt ?? r.createdAt).toLocaleDateString(),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return fields.some((value) => value.includes(q));
    });
  }, [items, debouncedQuery]);

  return (
    <main className={cn("min-h-dvh overflow-hidden bg-white")}>
      <PageHeader
        title="Generated Reports"
        subtitle="View and download all audit reports"
      />

      <div className="mb-6">
        <ReportsSearchCard
          query={query}
          onQueryChange={setQuery}
          placeholder="Search by project name, auditor, or report ID…"
        />
      </div>

      <ReportsListCard
        items={filtered}
        totalCount={data?.count ?? filtered.length}
        description="Complete list of generated audit reports"
        bodyMaxHeightClassName="max-h-[560px]"
        onDownload={() => {}}
        isLoading={isLoading}
        isError={isError}
        onError={refetch}
      />
    </main>
  );
};

export default ReportsPage;
