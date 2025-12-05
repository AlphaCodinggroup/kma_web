"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AuditsTable from "@features/audits/ui/AuditsTable";
import AuditsToolbar from "@features/audits/ui/AuditsToolBar";
import { cn } from "@shared/lib/cn";
import PageHeader from "@shared/ui/page-header";
import useListAudits from "@features/audits/lib/hooks/useListAudits";
import type { Audit } from "@entities/audit/model";
import { useSendForReviewAudit } from "@features/audits/lib/hooks/useSendForReviewAudit";

const AuditsPage: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [pendingAuditId, setPendingAuditId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useListAudits();

  const { start: startSendForReview, sendResult } = useSendForReviewAudit({
    refetchIntervalMs: 5000,
    stopWhenReady: true,
    onReady: () => refetch(),
  });

  const filtered = useMemo<Audit[]>(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.audits;

    return data.audits.filter((row) => {
      const projectId = row.projectId?.toLowerCase?.() ?? "";
      const auditor = row.createdBy?.toLowerCase?.() ?? "";
      const status = row.status?.toLowerCase?.() ?? "";
      const createdAt = row.createdAt?.toLowerCase?.() ?? "";
      return (
        projectId.includes(q) ||
        auditor.includes(q) ||
        createdAt.includes(q) ||
        status.includes(q)
      );
    });
  }, [data, query]);

  const handleEdit = useCallback(
    (audit: Audit) => {
      if (audit.status === "draft_report_pending_review") {
        startSendForReview(audit.id);
        setPendingAuditId(audit.id);
        return;
      }
      const href = `/audits/${encodeURIComponent(
        audit.id
      )}/edit` as Route<`/audits/${string}/edit`>;
      router.push(href);
    },
    [router, startSendForReview]
  );

  useEffect(() => {
    if (!sendResult || !pendingAuditId) return;
    const href = `/audits/${encodeURIComponent(
      pendingAuditId
    )}/edit` as Route<`/audits/${string}/edit`>;
    router.push(href);
    setPendingAuditId(null);
  }, [sendResult, pendingAuditId, router]);

  return (
    <main className={cn("min-h-dv hoverflow-hidden bg-white")}>
      <PageHeader title="Audits" subtitle="Manage all system audits" />
      <div
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
        )}
      >
        <AuditsToolbar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search audits…"
        />
        <AuditsTable
          items={filtered}
          onEdit={handleEdit}
          loading={isLoading}
          error={isError}
          onError={refetch}
        />
      </div>
    </main>
  );
};

export default AuditsPage;
