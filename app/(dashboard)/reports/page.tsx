"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import ReportsSearchCard from "@features/reports/ui/ReportsSearchCard";
import ReportsListCard from "@features/reports/ui/ReportsListCard";
import { useReportsListQuery } from "@features/reports/lib/hooks/useReportsQuery";
import { useReportByIdQuery } from "@features/reports/lib/hooks/useReportByIdQuery";
import PageHeader from "@shared/ui/page-header";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import { cn } from "@shared/lib/cn";
import { useDeleteReport } from "@features/reports/lib/hooks/useDeleteReport";
import { useRestoreReport } from "@features/reports/lib/hooks/useRestoreReport";

const ReportsPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedSearch(query);

  // Listado de reports
  const {
    data,
    isLoading: isListLoading,
    isError: isListError,
    refetch,
  } = useReportsListQuery({ includeArchived: true });
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackDownload, setFallbackDownload] = useState<string | null>(null);

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

  /**
   * Descarga del PDF usando el hook de detalle (useReportByIdQuery)
   */

  // ID de la auditoría para la que se está intentando descargar el reporte
  const [downloadAuditId, setDownloadAuditId] = useState<string | null>(null);

  const {
    data: downloadReport,
    isLoading: isDownloadLoading,
    isError: isDownloadError,
    error: downloadError,
  } = useReportByIdQuery({
    id: downloadAuditId ?? undefined,
    // Solo disparar la query cuando hay un ID seleccionado
    enabled: Boolean(downloadAuditId),
  });

  // Handler que dispara la descarga para un ID
  const handleDownload = useCallback(
    (auditId: string) => setDownloadAuditId(auditId),
    []
  );

  // Efecto que reacciona al resultado del hook de detalle
  useEffect(() => {
    if (!downloadAuditId) return;
    if (isDownloadLoading) return;
    if (isDownloadError) {
      setMessage(downloadError?.message ?? "The report could not be downloaded.");
      setDownloadAuditId(null);
      return;
    }
    if (!downloadReport) return;

    const url = downloadReport.reportUrl;
    const isValidUrl = url && /^https?:\/\//.test(url);

    if (isValidUrl) {
      const opened = window.open(
        url as string,
        "_blank",
        "noopener,noreferrer"
      );
      if (!opened) setFallbackDownload(url as string);
    } else {
      setMessage("This report version is not available for download.");
    }
    setDownloadAuditId(null);
  }, [
    downloadAuditId,
    isDownloadLoading,
    isDownloadError,
    downloadReport,
    downloadError,
  ]);

  // Delete report functionality
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useDeleteReport();
	const restoreMutation = useRestoreReport();
	const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = window.confirm(
        "Archive this consolidated report version? Administrators can restore it later."
      );

      if (!confirmed) return;

      try {
        setDeletingId(id);
        await deleteMutation.mutateAsync(id);
      } catch {
        setMessage(
          "The report version could not be archived. Please try again."
        );
      } finally {
        setDeletingId(null);
      }
    },
    [deleteMutation]
  );

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        setRestoringId(id);
        await restoreMutation.mutateAsync(id);
      } catch {
        setMessage(
          "The report version could not be restored. Please try again."
        );
      } finally {
        setRestoringId(null);
      }
    },
    [restoreMutation]
  );

  return (
    <main className={cn("min-h-dvh overflow-hidden bg-white")}>
      <PageHeader title="Reports" />

      <div className="mb-6">
        <ReportsSearchCard
          query={query}
          onQueryChange={setQuery}
          placeholder="Search reports..."
        />
      </div>
      {message ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {message}
        </div>
      ) : null}
      {fallbackDownload ? (
        <a
          className="mb-4 inline-block text-sm font-semibold underline"
          href={fallbackDownload}
          target="_blank"
          rel="noreferrer"
          onClick={() => setFallbackDownload(null)}
        >
          Open download
        </a>
      ) : null}

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
        onRestore={handleRestore}
        deletingId={deletingId}
        restoringId={restoringId}
        isDownloading={isDownloadLoading}
      />
    </main>
  );
};

export default ReportsPage;
