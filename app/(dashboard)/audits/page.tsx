"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AuditsTable from "@features/audits/ui/AuditsTable";
import AuditsToolbar from "@features/audits/ui/AuditsToolBar";
import { cn } from "@shared/lib/cn";
import PageHeader from "@shared/ui/page-header";
import useListAudits from "@features/audits/lib/hooks/useListAudits";
import type { Audit } from "@entities/audit/model";
import { Button } from "@shared/ui/controls";

const AuditsPage: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");

  const { data, isLoading, isError, refetch } = useListAudits();

  const filtered = useMemo<Audit[]>(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.audits;

    return data.audits.filter((row) => {
      const id = row.id?.toLowerCase?.() ?? "";
      const projectId = row.projectId?.toLowerCase?.() ?? "";
      const auditor = row.createdBy?.toLowerCase?.() ?? "";
      const status = row.status?.toLowerCase?.() ?? "";
      const createdAt = row.createdAt?.toLowerCase?.() ?? "";
      const updatedAt = row.updatedAt?.toLowerCase?.() ?? "";

      return (
        id.includes(q) ||
        projectId.includes(q) ||
        auditor.includes(q) ||
        status.includes(q) ||
        createdAt.includes(q) ||
        updatedAt.includes(q)
      );
    });
  }, [data, query]);

  const handleEdit = useCallback(
    (id: string) => {
      const href = `/audits/${encodeURIComponent(
        id
      )}/edit` as Route<`/audits/${string}/edit`>;
      router.push(href);
    },
    [router]
  );

  return (
    <main className={cn("min-h-dv hoverflow-hidden bg-white")}>
      <PageHeader title="Audits" subtitle="Manage all system audits" />
      <div
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
        )}
      >
        {/* Banner de error (no rompe layout) */}
        {isError && (
          <div className="mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>Failed to load audits. Please try again.</span>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {/* Indicador de carga sutil (mantiene el layout) */}
        {isLoading && (
          <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 animate-pulse">
            Loading audits…
          </div>
        )}

        <AuditsToolbar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search audits…"
        />
        <AuditsTable
          items={filtered}
          total={data?.total ?? 0}
          onEdit={handleEdit}
        />
      </div>
    </main>
  );
};

export default AuditsPage;
