export type DashboardMetrics = {
  totalProjects: number;
  totalFacilities: number;
  totalFacilitiesUnassigned: number;
  totalAuditsCompleted: number;
  totalDraftReportsPendingReview: number;
  totalDraftReportsInReview: number;
  totalFinalReportsSentToClient: number;
};

export type ProjectFacilitySummary = {
  projectId: string;
  projectName: string;
  facilitiesUnassigned: number;
  facilitiesCompleted: number;
};

export type RecentActivityItem = {
  auditId: string;
  projectId: string;
  projectName: string;
  facilityId: string;
  facilityName: string;
  flowId: string;
  flowName: string;
  auditorId: string;
  auditorName: string;
  /** Fecha de finalización, o null si la auditoría no se completó. */
  completedAt: string | null;
};

export type DashboardSummary = {
  metrics: DashboardMetrics;
  projectFacilitiesSummary: ProjectFacilitySummary[];
  recentActivity: RecentActivityItem[];
};
