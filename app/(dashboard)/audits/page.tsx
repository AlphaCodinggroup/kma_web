"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AuditsTable from "@features/audits/ui/AuditsTable";
import AuditsToolbar from "@features/audits/ui/AuditsToolBar";
import { cn } from "@shared/lib/cn";
import PageHeader from "@shared/ui/page-header";
import useListAudits from "@features/audits/lib/hooks/useListAudits";
import { useDeleteAudit } from "@features/audits/lib/hooks/useDeleteAudit";
import { useAuditors } from "@features/audits/lib/hooks/useAuditors";
import type { Audit } from "@entities/audit/model";
import { auditReviewDetailRepo } from "@features/audits/api/audit-review.repo.impl";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@shared/ui/modal";
import { Button } from "@shared/ui/controls";

const AuditsPage: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [noFindingsDialogOpen, setNoFindingsDialogOpen] = useState(false);

  // Filter state
  const [auditorFilter, setAuditorFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch audits with filters applied server-side
  // Use useMemo to ensure React Query detects filter changes
  const listOptions = useMemo(() => {
    const opts: import("@features/audits/lib/hooks/useListAudits").UseListAuditsOptions = {
      limit: 200, // Hybrid pagination threshold
    };
    if (statusFilter) opts.status = statusFilter;
    if (auditorFilter) opts.auditor = auditorFilter;
    return opts;
  }, [statusFilter, auditorFilter]);

  const { data, isLoading, isError, isFetching, refetch } = useListAudits(listOptions);
  const deleteMutation = useDeleteAudit();

  // Fetch auditors from API
  const { auditors: availableAuditors } = useAuditors();

  // Detect pagination mode: server-side if last_eval_id present, client-side otherwise
  const paginationMode = useMemo(() => {
    return data?.last_eval_id ? "server" : "client";
  }, [data?.last_eval_id]);

  // Client-side text search (only applied in client-side mode)
  const clientFiltered = useMemo<Audit[]>(() => {
    if (!data?.audits) return [];

    // In server-side mode, data is already filtered by backend
    if (paginationMode === "server") {
      return data.audits;
    }

    // In client-side mode, apply text search filter
    const q = query.trim().toLowerCase();
    if (!q) return data.audits;

    return data.audits.filter((row) => {
      const projectId = row.projectId?.toLowerCase?.() ?? "";
      const projectName = row.projectName?.toLowerCase?.() ?? "";
      const facilityName = row.facilityName?.toLowerCase?.() ?? "";
      const flowName = row.flowName?.toLowerCase?.() ?? "";
      const createdAt = row.createdAt?.toLowerCase?.() ?? "";
      return (
        projectId.includes(q) ||
        projectName.includes(q) ||
        facilityName.includes(q) ||
        flowName.includes(q) ||
        createdAt.includes(q)
      );
    });
  }, [data, query, paginationMode]);

  // Pagination logic based on mode
  const { paginatedData, totalPages, totalItems } = useMemo(() => {
    if (paginationMode === "server") {
      // Server-side: display data as-is, use total from backend
      return {
        paginatedData: clientFiltered,
        totalPages: Math.ceil((data?.total ?? 0) / pageSize),
        totalItems: data?.total ?? 0,
      };
    } else {
      // Client-side: paginate in memory
      const total = clientFiltered.length;
      const pages = Math.ceil(total / pageSize);
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;

      return {
        paginatedData: clientFiltered.slice(start, end),
        totalPages: pages,
        totalItems: total,
      };
    }
  }, [clientFiltered, currentPage, pageSize, paginationMode, data?.total]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [auditorFilter, statusFilter, query, pageSize]);

  const handleClearFilters = useCallback(() => {
    setAuditorFilter("");
    setStatusFilter("");
  }, []);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (audit: Audit) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete the audit for "${audit.projectName ?? audit.id}"?\n\nThis action cannot be undone.`
      );

      if (!confirmed) return;

      try {
        setDeletingId(audit.id);
        await deleteMutation.mutateAsync(audit.id);
      } catch (err) {
        console.error("Error deleting audit:", err);
        alert("Error deleting the audit. Please try again.");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteMutation]
  );

  const handleEdit = useCallback(
    async (audit: Audit, isCompliant?: boolean) => {
      if (isCompliant) {
        setNoFindingsDialogOpen(true);
        return;
      }
      if (audit.status === "draft_report_pending_review") {
        setEditingId(audit.id);
        try {
          await auditReviewDetailRepo.openReview(audit.id);
        } catch (error) {
          console.error("Error opening review:", error);
          alert("The review could not be opened. Please try again.");
          setEditingId(null);
          return;
        }
      }
      setEditingId(audit.id);
      const auditorName = audit.auditorName ?? audit.createdBy ?? "";
      const baseHref = `/audits/${encodeURIComponent(
        audit.id
      )}/edit` as Route<`/audits/${string}/edit`>;
      const href =
        auditorName.trim().length > 0
          ? (`${baseHref}?auditor=${encodeURIComponent(
            auditorName
          )}` as Route<`/audits/${string}/edit`>)
          : baseHref;
      router.push(href);
    },
    [router]
  );

  return (
    <main className={cn("min-h-dv hoverflow-hidden bg-white")}>
      <PageHeader title="Audits" />
      <div
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
        )}
      >
        <AuditsToolbar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search audits…"
          auditorFilter={auditorFilter}
          statusFilter={statusFilter}
          onAuditorFilterChange={setAuditorFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
          availableAuditors={availableAuditors}
        />
        <AuditsTable
          items={paginatedData}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
          editingId={editingId}
          loading={isLoading}
          fetching={isFetching}
          error={isError}
          onError={refetch}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
      <Modal open={noFindingsDialogOpen} onOpenChange={setNoFindingsDialogOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>No Report Needed</ModalTitle>
            <ModalDescription>
              This audit has no findings — all answers are compliant. No report will be generated.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              type="button"
              onClick={() => setNoFindingsDialogOpen(false)}
              className="bg-black hover:opacity-80 rounded-xl w-full"
            >
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </main>
  );
};

export default AuditsPage;
