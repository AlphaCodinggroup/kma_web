"use client";

import React, { useMemo } from "react";
import ReviewPipeline from "@widgets/dashboard/ReviewPipeline";
import { RefreshCw } from "lucide-react";
import PageHeader from "@shared/ui/page-header";
import { Button } from "@shared/ui/controls";
import DashboardActivitySection from "@widgets/dashboard/DashboardActivitySection";
import DashboardMetrics, {
  type DashboardMetricItem,
} from "@widgets/dashboard/DashboardMetrics";
import { useDashboardSummary } from "@features/dashboard/ui/useDashboardSummary";
import { Retry } from "@shared/ui/Retry";
import { formatIsoToYmdHm } from "@shared/lib/date";
import type { Activity } from "@widgets/dashboard/DashboardActivitySection";
import { PublicEnv } from "@shared/config/env";

const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, isFetching, refetch } = useDashboardSummary();

  const metricsItems = useMemo<DashboardMetricItem[]>(() => {
    const metrics = data?.metrics;
    if (!metrics) return [];

    const fmt = (value: number) =>
      Number.isFinite(value) ? value.toLocaleString(PublicEnv.locale) : "-";

    return [
      {
        title: "Projects",
        value: fmt(metrics.totalProjects),
        subtitle: "Workspace total",
        icon: "brief-case",
      },
      {
        title: "Facilities",
        value: fmt(metrics.totalFacilities),
        subtitle: "Workspace total",
        icon: "building",
      },
      {
        title: "Unassigned facilities",
        value: fmt(metrics.totalFacilitiesUnassigned),
        subtitle: "Without assigned auditors",
        icon: "alert-circle",
      },
      {
        title: "Completed audits",
        value: fmt(metrics.totalAuditsCompleted),
        subtitle: "Completed audits",
        icon: "file-check",
      },
    ];
  }, [data?.metrics]);

  const activityItems = useMemo<Activity[]>(() => {
    return (data?.recentActivity ?? []).map((item) => ({
      project: item.projectName,
      facility: item.facilityName,
      flow: item.flowName,
      auditor: item.auditorName || "-",
      time: item.completedAt ? formatIsoToYmdHm(item.completedAt) : "-",
      variant: "success",
    }));
  }, [data?.recentActivity]);

  return (
    <div className="space-y-6" aria-busy={isLoading || isFetching}>
      <PageHeader title="Dashboard" subtitle="Manage your audit workload and keep project reviews moving." actionSlot={
        <Button type="button" variant="secondary" fullWidth={false} onClick={() => refetch()} disabled={isFetching} aria-busy={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />Refresh
        </Button>
      } />

      {isError && !data ? (
        <Retry
          text="Could not load dashboard."
          textButton="Retry"
          onClick={() => refetch()}
        />
      ) : (
        <>
          {data?.metrics && <ReviewPipeline pending={formatCount(data.metrics.totalDraftReportsPendingReview)} inReview={formatCount(data.metrics.totalDraftReportsInReview)} delivered={formatCount(data.metrics.totalFinalReportsSentToClient)} />}
          {isError && <p role="status" className="rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] p-4 text-sm text-[var(--kma-muted)]">Showing the last available overview. Refresh to try again.</p>}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
          {isLoading ? <ActivitySkeleton /> : <DashboardActivitySection items={activityItems} />}
          {isLoading ? (
            <MetricsSkeleton />
          ) : metricsItems.length ? (
            <section aria-labelledby="portfolio-title"><h2 id="portfolio-title" className="mb-4 border-b border-[var(--kma-border)] pb-4 text-xl leading-7 font-semibold">Portfolio</h2><DashboardMetrics items={metricsItems} /></section>
          ) : (
            <div className="rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] px-4 py-8 text-center text-sm text-[var(--kma-muted)]">
              No metrics available.
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;

function formatCount(value: number) {
  return Number.isFinite(value) ? value.toLocaleString(PublicEnv.locale) : "-";
}

const MetricsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-px border-y border-[var(--kma-border)] md:grid-cols-4">
      {[1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className="h-28 rounded-lg border border-[var(--kma-border)] bg-[var(--kma-input)] animate-pulse"
        />
      ))}
    </div>
  );
};

const ActivitySkeleton: React.FC = () => {
  return (
    <div className="rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] p-5">
      <div className="mb-4 h-5 w-40 rounded bg-[var(--kma-border)]" />
      <div className="mb-2 h-4 w-64 rounded bg-[var(--kma-input)]" />
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-[var(--kma-muted)]" />
            <div className="space-y-1">
              <div className="h-4 w-56 rounded bg-[var(--kma-input)]" />
              <div className="h-3 w-32 rounded bg-[var(--kma-input)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
