"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import ReportsSearchCard from "@features/reports/ui/ReportsSearchCard";
import ReportsListCard from "@features/reports/ui/ReportsListCard";
import { useReportsListQuery } from "@features/reports/lib/hooks/useReportsQuery";
import PageHeader from "@shared/ui/page-header";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import { useDeleteReport } from "@features/reports/lib/hooks/useDeleteReport";
import { useDownloadReportFile } from "@features/reports/lib/hooks/useDownloadReportFile";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import { useUrlParameter } from "@shared/lib/useUrlParameter";

const ReportsPage: React.FC = () => {
  const [query, setQuery] = useUrlParameter("q");
  const debouncedQuery = useDebouncedSearch(query);
  const { data, isLoading: isListLoading, isError: isListError, refetch } = useReportsListQuery();
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return !q ? items : items.filter(report => [report.reportName, new Date(report.createdAt).toLocaleDateString(), report.status].some(value => value?.toLowerCase().includes(q)));
  }, [items, debouncedQuery]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { download: downloadReport, activeId: downloadingId } = useDownloadReportFile();
  const handleDownload = useCallback((id: string) => {
    const report = items.find(item => item.id === id);
    if (!report) return;
    setActionError(null);
    setSuccess(null);
    void downloadReport(report).then(() => setSuccess("Report downloaded.")).catch(() => setActionError("The report could not be downloaded. Please try again."));
  }, [downloadReport, items]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleting = useRef(false);
  const deleteMutation = useDeleteReport();
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting.current) return;
    deleting.current = true;
    setDeletingId(pendingDelete);
    setDeleteError(null);
    setSuccess(null);
    try {
      await deleteMutation.mutateAsync(pendingDelete);
      setPendingDelete(null);
      setSuccess("Report deleted.");
    } catch {
      setDeleteError("The report could not be deleted. Please try again.");
    } finally {
      deleting.current = false;
      setDeletingId(null);
    }
  }, [deleteMutation, pendingDelete]);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Reports" subtitle="Find and download consolidated project reports." />
      {actionError && <p role="alert" className="rounded-lg border border-[var(--kma-danger-border)] bg-[var(--kma-danger-bg)] p-4 text-sm text-[var(--kma-danger)]">{actionError}</p>}
      {success && <p role="status" className="rounded-lg border border-[var(--kma-success-border)] bg-[var(--kma-success-bg)] p-4 text-sm text-[var(--kma-success)]">{success}</p>}
      <ReportsListCard
        items={filtered}
        rightSlot={<ReportsSearchCard query={query} onQueryChange={setQuery} placeholder="Search reports..." />}
        totalCount={data?.count ?? filtered.length}
        description={query ? `${filtered.length} matching reports` : "Consolidated PDF reports, organized by project"}
        bodyMaxHeightClassName="max-h-[560px]"
        isLoading={isListLoading}
        isError={isListError}
        onError={() => void refetch()}
        onDownload={handleDownload}
        onDelete={id => { setDeleteError(null); setPendingDelete(id); }}
        deletingId={deletingId}
        downloadingId={downloadingId}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={open => { if (!open && !deleting.current) setPendingDelete(null); }}
        title="Delete report?"
        description={`Delete “${items.find(report => report.id === pendingDelete)?.reportName ?? pendingDelete ?? "this report"}”? This action cannot be undone.`}
        confirmLabel="Delete report"
        loading={Boolean(deletingId)}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ReportsPage;
