import type {
  DashboardSummary,
  DashboardMetrics,
  ProjectFacilitySummary,
  RecentActivityItem,
} from "@entities/dashboard/model/dashboard";

export type DashboardMetricsDTO = {
  total_projects?: number | null;
  total_facilities?: number | null;
  total_facilities_unassigned?: number | null;
  total_audits_completed?: number | null;
  total_draft_reports_pending_review?: number | null;
  total_draft_reports_in_review?: number | null;
  total_final_reports_sent_to_client?: number | null;
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
  facility_name?: string | null;
  flow_id?: string | null;
  flow_name?: string | null;
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
    totalFacilities: toNumber(dto?.total_facilities, 0),
    totalFacilitiesUnassigned: toNumber(dto?.total_facilities_unassigned, 0),
    totalAuditsCompleted: toNumber(dto?.total_audits_completed, 0),
    totalDraftReportsPendingReview: toNumber(dto?.total_draft_reports_pending_review, 0),
    totalDraftReportsInReview: toNumber(dto?.total_draft_reports_in_review, 0),
    totalFinalReportsSentToClient: toNumber(dto?.total_final_reports_sent_to_client, 0),
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
    facilityName: toString(dto.facility_name),
    flowId: toString(dto.flow_id),
    flowName: toString(dto.flow_name),
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
