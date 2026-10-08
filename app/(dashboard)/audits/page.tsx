"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Audit } from "@entities/audit/model";
import AuditsTable from "@features/audits/ui/AuditsTable";
import AuditsToolbar from "@features/audits/ui/AuditsToolBar";
import { useInfiniteAudits } from "@features/audits/lib/hooks/useInfiniteAudits";
import { useDeleteAudit } from "@features/audits/lib/hooks/useDeleteAudit";
import { useAuditors } from "@features/audits/lib/hooks/useAuditors";
import { useOpenAuditReview } from "@features/audits/lib/hooks/useOpenAuditReview";
import NoReportNeededModal from "@features/audits/ui/NoReportNeededModal";
import PageHeader from "@shared/ui/page-header";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import { Button } from "@shared/ui/controls";
import { useUrlParameter } from "@shared/lib/useUrlParameter";

const AuditsPage: React.FC = () => {
  const [query, setQuery] = useUrlParameter("q");
  const [auditorFilter, setAuditorFilter] = useUrlParameter("auditor");
  const [statusFilter, setStatusFilter] = useUrlParameter("status");
  const [pageValue, setPageValue] = useUrlParameter("page", "1");
  const [sizeValue, setSizeValue] = useUrlParameter("size", "25");
  const pageSize = Math.max(1, Math.min(100, Number(sizeValue) || 25));
  const page = Math.max(1, Number(pageValue) || 1);
  const listOptions = useMemo(() => ({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(auditorFilter ? { auditor: auditorFilter } : {}),
  }), [statusFilter, auditorFilter]);
  const list = useInfiniteAudits(listOptions);
  const deleteMutation = useDeleteAudit();
  const { auditors: availableAuditors } = useAuditors();
  const returnQuery = new URLSearchParams();
  if (query) returnQuery.set("q", query);
  if (auditorFilter) returnQuery.set("auditor", auditorFilter);
  if (statusFilter) returnQuery.set("status", statusFilter);
  if (pageValue !== "1") returnQuery.set("page", pageValue);
  if (sizeValue !== "25") returnQuery.set("size", sizeValue);
  const returnTo = returnQuery.size ? `/audits?${returnQuery}` : undefined;
  const { openReview: handleEdit, editingId, noReportNeeded } = useOpenAuditReview({ onReady: () => list.refetch(), returnTo });
  const [pendingDelete, setPendingDelete] = useState<Audit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleting = useRef(false);

  // Cada fila aparece una sola vez aunque los datos cambien entre páginas del servidor.
  const loaded = useMemo(() => [...new Map((list.data?.pages ?? []).flatMap(chunk => chunk.audits).map(audit => [audit.id, audit])).values()], [list.data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !q ? loaded : loaded.filter(audit => [audit.projectId, audit.projectName, audit.facilityName, audit.flowName, audit.auditorName, audit.createdAt].some(value => value?.toLowerCase().includes(q)));
  }, [loaded, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const items = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const needsPageRestore = page > totalPages && Boolean(list.hasNextPage);
  const { data: loadedPages, isFetching, isFetchNextPageError, isRefetchError, fetchNextPage } = list;
  useEffect(() => {
    if (!needsPageRestore || !loadedPages || isFetching || isFetchNextPageError || isRefetchError) return;
    void fetchNextPage({ cancelRefetch: false });
  }, [needsPageRestore, loadedPages, isFetching, isFetchNextPageError, isRefetchError, fetchNextPage]);
  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPageValue("1");
  };
  const clearFilters = () => {
    setAuditorFilter("");
    setStatusFilter("");
    setQuery("");
    setPageValue("1");
  };
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting.current) return;
    deleting.current = true;
    setDeletingId(pendingDelete.id);
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      setDeleteError("The audit could not be deleted. Please try again.");
    } finally {
      deleting.current = false;
      setDeletingId(null);
    }
  }, [deleteMutation, pendingDelete]);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Audits" subtitle="Review findings, coordinate feedback, and move each audit forward." />
      <section className="overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold">Review queue</h2>
            <span className="text-sm tabular-nums text-[var(--kma-muted)]">{list.isLoading ? "Loading…" : `${filtered.length} loaded`}</span>
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--kma-muted)]">
            <span className="sr-only">Loaded results:</span>
            <span><strong className="font-semibold tabular-nums text-[var(--kma-fg)]">{loaded.filter(audit => audit.status === "draft_report_pending_review").length}</strong> pending</span>
            <span><strong className="font-semibold tabular-nums text-[var(--kma-fg)]">{loaded.filter(audit => audit.status === "draft_report_in_review").length}</strong> in review</span>
            <span className="sr-only">in loaded results</span>
          </p>
        </div>
        <div className="border-b border-[var(--kma-border)] p-4 sm:px-6">
          <AuditsToolbar
            searchValue={query}
            onSearchChange={value => changeFilter(setQuery, value)}
            searchPlaceholder="Search audits…"
            auditorFilter={auditorFilter}
            statusFilter={statusFilter}
            onAuditorFilterChange={value => changeFilter(setAuditorFilter, value)}
            onStatusFilterChange={value => changeFilter(setStatusFilter, value)}
            onClearFilters={clearFilters}
            availableAuditors={availableAuditors}
          />
        </div>
        {list.isRefetchError && (
          <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--kma-danger-border)] bg-[var(--kma-danger-bg)] p-3 sm:mx-5">
            <p role="alert" className="text-sm text-[var(--kma-danger)]">Audits could not be refreshed. Your previously loaded results and filters are preserved.</p>
            <Button fullWidth={false} onClick={() => void list.refetch()} disabled={list.isFetching} isLoading={list.isRefetching}>Retry refresh</Button>
          </div>
        )}
        <AuditsTable
          items={items}
          onEdit={handleEdit}
          onDelete={audit => { setDeleteError(null); setPendingDelete(audit); }}
          deletingId={deletingId}
          editingId={editingId}
          loading={list.isLoading}
          fetching={list.isFetching && !list.isFetchingNextPage}
          error={list.isError && !list.data}
          onError={() => void list.refetch()}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={value => setPageValue(String(value))}
          onPageSizeChange={value => changeFilter(setSizeValue, String(value))}
        />
        {!list.isLoading && list.data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--kma-border)] bg-[var(--kma-subtle)] px-4 py-3 text-xs sm:px-6" role="status">
            <span className="text-[var(--kma-muted)]">
              {loaded.length} audits loaded{list.isRefetchError ? ". Showing previously loaded results; refresh failed." : list.hasNextPage ? ". More results are available." : ". All available results loaded."}
              {needsPageRestore ? list.isFetchNextPageError || list.isRefetchError ? ` Page ${page} needs additional results; retry to continue.` : ` Loading results to restore page ${page}.` : ""}
              {query && list.hasNextPage ? " Search applies to loaded audits; load more to search additional results." : ""}
            </span>
            {list.hasNextPage && <Button fullWidth={false} onClick={() => void list.fetchNextPage()} disabled={list.isFetching} isLoading={list.isFetchingNextPage}>{list.isFetchNextPageError ? "Retry loading more" : "Load more audits"}</Button>}
            {list.isFetchNextPageError && <p className="w-full text-[var(--kma-danger)]" role="alert">More audits could not be loaded. Your current results and filters are preserved.</p>}
          </div>
        )}
      </section>
      <NoReportNeededModal open={noReportNeeded.open} onOpenChange={noReportNeeded.onOpenChange} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={open => { if (!open && !deleting.current) setPendingDelete(null); }}
        title="Delete audit?"
        description={`Delete the audit for “${pendingDelete?.projectName ?? pendingDelete?.id ?? ""}”? This action cannot be undone.`}
        confirmLabel="Delete audit"
        loading={Boolean(deletingId)}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AuditsPage;
