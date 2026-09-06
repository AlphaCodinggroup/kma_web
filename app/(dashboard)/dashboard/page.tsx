"use client";

import React, { useMemo } from "react";
import DashboardActivitySection from "@widgets/dashboard/DashboardActivitySection";
import DashboardMetrics, {
  type DashboardMetricItem,
} from "@widgets/dashboard/DashboardMetrics";
import { useDashboardSummary } from "@features/dashboard/ui/useDashboardSummary";
import { Retry } from "@shared/ui/Retry";
import { formatIsoToYmdHm } from "@shared/lib/date";
import type { Activity } from "@widgets/dashboard/DashboardActivitySection";

const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  const metricsItems = useMemo<DashboardMetricItem[]>(() => {
    const metrics = data?.metrics;
    if (!metrics) return [];

    const fmt = (value: number) =>
      Number.isFinite(value) ? value.toLocaleString("es-ES") : "-";

    return [
      {
        title: "Totals Projects",
        value: fmt(metrics.totalProjects),
        subtitle: "Active Projects",
        icon: "brief-case",
      },
      {
        title: "Totals Facilities",
        value: fmt(metrics.totalFacilities),
        subtitle: "Active Facilities",
        icon: "building", // You might need to check if this icon exists in MetricCard or lucide
      },
      {
        title: "Facilities Unassigned",
        value: fmt(metrics.totalFacilitiesUnassigned),
        subtitle: "Without assigned auditors",
        icon: "alert-circle",
      },
      {
        title: "Audits Completed",
        value: fmt(metrics.totalAuditsCompleted),
        subtitle: "Completed audits",
        icon: "file-check",
      },
      {
        title: "Reports Pending Review",
        value: fmt(metrics.totalDraftReportsPendingReview),
        subtitle: "Drafts waiting for review",
        icon: "clock",
      },
      {
        title: "Reports In Review",
        value: fmt(metrics.totalDraftReportsInReview),
        subtitle: "Currently in review",
        icon: "eye",
      },
      {
        title: "Reports Approved",
        value: fmt(metrics.totalFinalReportsSentToClient),
        subtitle: "Approved for report generation",
        icon: "send",
      },
    ];
  }, [data?.metrics]);

  const activityItems = useMemo<Activity[]>(() => {
    return (data?.recentActivity ?? []).map((item) => ({
      // Let's format it as: Project | Facility - Flow
      project: `${item.projectName} | ${item.facilityName} - ${item.flowName}`,
      auditor: item.auditorName || "-",
      time: item.completedAt ? formatIsoToYmdHm(item.completedAt) : "-",
      variant: "success",
    }));
  }, [data?.recentActivity]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {isError ? (
        <Retry
          text="Could not load dashboard."
          textButton="Retry"
          onClick={() => refetch()}
        />
      ) : (
        <>
          {isLoading ? (
            <MetricsSkeleton />
          ) : metricsItems.length ? (
            <DashboardMetrics items={metricsItems} />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600 shadow-sm">
              No metrics available.
            </div>
          )}

          {isLoading ? (
            <ActivitySkeleton />
          ) : (
            <DashboardActivitySection items={activityItems} />
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;

const MetricsSkeleton: React.FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5].map((idx) => (
        <div
          key={idx}
          className="h-28 rounded-2xl border border-gray-200 bg-gray-100 animate-pulse"
        />
      ))}
    </div>
  );
};

const ActivitySkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 h-5 w-40 rounded bg-gray-200" />
      <div className="mb-2 h-4 w-64 rounded bg-gray-100" />
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-gray-300" />
            <div className="space-y-1">
              <div className="h-4 w-56 rounded bg-gray-100" />
              <div className="h-3 w-32 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
