export type DashboardMetrics = {
  totalProjects: number;
  totalProjectsComplete: number;
  totalReportsComplete: number;
  totalReportsSentToClient: number;
  totalReportsReadyForQc: number;
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
  auditorId: string;
  auditorName: string;
  completedAt: string;
};

export type DashboardSummary = {
  metrics: DashboardMetrics;
  projectFacilitiesSummary: ProjectFacilitySummary[];
  recentActivity: RecentActivityItem[];
};
