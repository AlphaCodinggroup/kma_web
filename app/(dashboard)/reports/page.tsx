"use client";

import React, { useCallback, useMemo, useState } from "react";

import ReportsSearchCard from "@features/reports/ui/ReportsSearchCard";
import ReportsListCard from "@features/reports/ui/ReportsListCard";
import { useReportsListQuery } from "@features/reports/lib/hooks/useReportsQuery";
import PageHeader from "@shared/ui/page-header";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import { cn } from "@shared/lib/cn";
import { useDeleteReport } from "@features/reports/lib/hooks/useDeleteReport";
import { useDownloadReportFile } from "@features/reports/lib/hooks/useDownloadReportFile";

const ReportsPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedSearch(query);

  // Listado de reports
  const {
    data,
    isLoading: isListLoading,
    isError: isListError,
    refetch,
  } = useReportsListQuery();

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const filtered = useMemo(() => {
    const q = debouncedQuery;
    if (!q) return items;

    return items.filter((r) => {
      const fields = [
        r.reportName ?? "",
        new Date(r.createdAt).toLocaleDateString(),
        r.status,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return fields.some((value) => value.includes(q));
    });
  }, [items, debouncedQuery]);

  const {
    download: downloadReport,
    activeId: downloadingId,
  } = useDownloadReportFile();
  const handleDownload = useCallback(
    (auditId: string) => {
      const report = items.find((item) => item.id === auditId);
      if (!report) return;
      void downloadReport(report).catch((error: unknown) => {
        console.error("[ReportsPage] Error downloading report:", error);
        alert("Error downloading the report. Please try again.");
      });
    },
    [downloadReport, items]
  );

  // Delete report functionality
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useDeleteReport();

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this report? This action cannot be undone."
      );

      if (!confirmed) return;

      try {
        setDeletingId(id);
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error("[ReportsPage] Error deleting report:", err);
        alert("Error deleting the report. Please try again.");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteMutation]
  );

  return (
    <main className={cn("min-h-dvh overflow-hidden bg-white")}>
      <PageHeader
        title="Reports"
      />

      <div className="mb-6">
        <ReportsSearchCard
          query={query}
          onQueryChange={setQuery}
          placeholder="Search reports..."
        />
      </div>

      <ReportsListCard
        items={filtered}
        totalCount={data?.count ?? filtered.length}
        description="Complete list of generated audit reports"
        bodyMaxHeightClassName="max-h-[560px]"
        isLoading={isListLoading}
        isError={isListError}
        onError={refetch}
        onDownload={handleDownload}
        onDelete={handleDelete}
        deletingId={deletingId}
        downloadingId={downloadingId}
      />
    </main>
  );
};

export default ReportsPage;
