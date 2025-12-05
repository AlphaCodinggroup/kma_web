import type {
  DashboardSummary,
  DashboardMetrics,
  ProjectFacilitySummary,
  RecentActivityItem,
} from "@entities/dashboard/model/dashboard";

export type DashboardMetricsDTO = {
  total_projects?: number | null;
  total_projects_complete?: number | null;
  total_reports_complete?: number | null;
  total_reports_sent_to_client?: number | null;
  total_reports_ready_for_qc?: number | null;
};

export type ProjectFacilitySummaryDTO = {
  project_id?: string | null;
  project_name?: string | null;
  facilities_unassigned?: number | null;
  facilities_completed?: number | null;
};

export type RecentActivityDTO = {
  audit_id?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  facility_id?: string | null;
  auditor_id?: string | null;
  auditor_name?: string | null;
  completed_at?: string | null;
};

export type DashboardSummaryDTO = {
  metrics?: DashboardMetricsDTO | null;
  project_facilities_summary?: ProjectFacilitySummaryDTO[] | null;
  recent_activity?: RecentActivityDTO[] | null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
};

const mapDashboardMetricsDTO = (
  dto: DashboardMetricsDTO | null | undefined
): DashboardMetrics => {
  return {
    totalProjects: toNumber(dto?.total_projects, 0),
    totalProjectsComplete: toNumber(dto?.total_projects_complete, 0),
    totalReportsComplete: toNumber(dto?.total_reports_complete, 0),
    totalReportsSentToClient: toNumber(dto?.total_reports_sent_to_client, 0),
    totalReportsReadyForQc: toNumber(dto?.total_reports_ready_for_qc, 0),
  };
};

export const mapProjectFacilitySummaryDTO = (
  dto: ProjectFacilitySummaryDTO
): ProjectFacilitySummary => {
  return {
    projectId: toString(dto.project_id),
    projectName: toString(dto.project_name),
    facilitiesUnassigned: toNumber(dto.facilities_unassigned, 0),
    facilitiesCompleted: toNumber(dto.facilities_completed, 0),
  };
};

export const mapRecentActivityDTO = (
  dto: RecentActivityDTO
): RecentActivityItem => {
  return {
    auditId: toString(dto.audit_id),
    projectId: toString(dto.project_id),
    projectName: toString(dto.project_name),
    facilityId: toString(dto.facility_id),
    auditorId: toString(dto.auditor_id),
    auditorName: toString(dto.auditor_name),
    completedAt: toString(dto.completed_at),
  };
};

export const mapDashboardSummaryDTO = (
  dto: DashboardSummaryDTO
): DashboardSummary => {
  return {
    metrics: mapDashboardMetricsDTO(dto.metrics),
    projectFacilitiesSummary: Array.isArray(dto.project_facilities_summary)
      ? dto.project_facilities_summary.map(mapProjectFacilitySummaryDTO)
      : [],
    recentActivity: Array.isArray(dto.recent_activity)
      ? dto.recent_activity.map(mapRecentActivityDTO)
      : [],
  };
};
