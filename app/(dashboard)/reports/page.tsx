"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import ReportsSearchCard from "@features/reports/ui/ReportsSearchCard";
import ReportsListCard from "@features/reports/ui/ReportsListCard";
import { useReportsListQuery } from "@features/reports/lib/hooks/useReportsQuery";
import { useReportByIdQuery } from "@features/reports/lib/hooks/useReportByIdQuery";
import PageHeader from "@shared/ui/page-header";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import { cn } from "@shared/lib/cn";

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
      console.error("[ReportsPage] Error downloading report:", downloadError);
      setDownloadAuditId(null);
      return;
    }
    if (!downloadReport) return;

    const url = downloadReport.reportUrl;
    const isValidUrl = url && /^https?:\/\//.test(url);

    if (isValidUrl) {
      window.open(url as string, "_blank", "noopener,noreferrer");
    } else {
      console.warn(
        "[ReportsPage] Report URL not ready or invalid for auditId:",
        downloadAuditId,
        "status:",
        downloadReport.status
      );
    }
    setDownloadAuditId(null);
  }, [
    downloadAuditId,
    isDownloadLoading,
    isDownloadError,
    downloadReport,
    downloadError,
  ]);

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
        isLoading={isListLoading}
        isError={isListError}
        onError={refetch}
        onDownload={handleDownload}
        isDownloading={isDownloadLoading}
      />
    </main>
  );
};

export default ReportsPage;
