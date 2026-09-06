import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  getReport: vi.fn(),
  deleteReport: vi.fn(),
  restoreReport: vi.fn(),
  fetchReportById: vi.fn(),
  fetchReports: vi.fn(),
  archiveProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  fetchProjects: vi.fn(),
  updateProject: vi.fn(),
  archiveFacility: vi.fn(),
  createFacility: vi.fn(),
  deleteFacility: vi.fn(),
  updateFacility: vi.fn(),
  restoreFacility: vi.fn(),
  getFacilities: vi.fn(),
  getUsers: vi.fn(),
  getDashboardSummary: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("@features/reports/api/audit-report.repo.impl", () => ({
  auditReportRepo: { getReport: mocks.getReport },
}));
vi.mock("@features/reports/api/reports.repo.impl", () => ({
  reportsRepo: { delete: mocks.deleteReport, restore: mocks.restoreReport },
}));
vi.mock("@features/reports/lib/usecases/fetch-report-by-id", () => ({
  fetchReportById: mocks.fetchReportById,
}));
vi.mock("@features/reports/lib/usecases/fetch-reports", () => ({
  fetchReports: mocks.fetchReports,
}));
vi.mock("@features/projects/api/projects.repo.impl", () => ({
  projectsRepoImpl: {},
}));
vi.mock("@features/projects/lib/usecases/archive-project", () => ({
  archiveProjectUseCase: mocks.archiveProject,
}));
vi.mock("@features/projects/lib/usecases/create-project", () => ({
  createProject: mocks.createProject,
}));
vi.mock("@features/projects/lib/usecases/deleteProject", () => ({
  deleteProject: mocks.deleteProject,
}));
vi.mock("@features/projects/lib/usecases/fetch-projects", () => ({
  fetchProjects: mocks.fetchProjects,
}));
vi.mock("@features/projects/lib/usecases/update-project", () => ({
  updateProject: mocks.updateProject,
}));
vi.mock("@features/facilities/api/facilities.repo.impl", () => ({
  facilitiesRepoImpl: {
    restore: mocks.restoreFacility,
    getFacilities: mocks.getFacilities,
  },
}));
vi.mock("@features/facilities/lib/usecases/archive-facility.usecase", () => ({
  archiveFacilityUseCase: mocks.archiveFacility,
}));
vi.mock("@features/facilities/lib/usecases/create-facility.usecase", () => ({
  createFacilityUseCase: mocks.createFacility,
}));
vi.mock("@features/facilities/lib/usecases/delete-facility.usecase", () => ({
  deleteFacilityUseCase: mocks.deleteFacility,
}));
vi.mock("@features/facilities/lib/usecases/update-facility.usecase", () => ({
  updateFacilityUseCase: mocks.updateFacility,
}));
vi.mock("@features/users/api/users.repo.impl", () => ({
  usersRepoImpl: { getUsers: mocks.getUsers },
}));
vi.mock("@features/dashboard/lib/usecases/get-dashboard-summary", () => ({
  getDashboardSummary: mocks.getDashboardSummary,
}));

import { auditReportKey, useAuditReport } from "./reports/lib/hooks/useAuditReport";
import { useDeleteReport } from "./reports/lib/hooks/useDeleteReport";
import {
  createReportByIdQueryOptions,
  reportByIdQueryKey,
  useReportByIdQuery,
} from "./reports/lib/hooks/useReportByIdQuery";
import {
  createReportsListQueryOptions,
  reportsListQueryKey,
  useReportsListQuery,
} from "./reports/lib/hooks/useReportsQuery";
import { useRestoreReport } from "./reports/lib/hooks/useRestoreReport";
import { useArchiveProjectMutation } from "./projects/ui/hooks/useArchiveProjectMutation";
import { useCreateProjectMutation } from "./projects/ui/hooks/useCreateProjectMutation";
import { useDeleteProjectMutation } from "./projects/ui/hooks/useDeleteProjectMutation";
import { useProjectsQuery } from "./projects/ui/hooks/useProjectsQuery";
import { useUpdateProjectMutation } from "./projects/ui/hooks/useUpdateProjectMutation";
import { useArchiveFacilityMutation } from "./facilities/ui/hooks/useArchiveFacilityMutation";
import { useCreateFacilityMutation } from "./facilities/ui/hooks/useCreateFacilityMutation";
import { useDeleteFacilityMutation } from "./facilities/ui/hooks/useDeleteFacilityMutation";
import { useFacilitiesQuery } from "./facilities/ui/hooks/useFacilitiesQuery";
import { useRestoreFacilityMutation } from "./facilities/ui/hooks/useRestoreFacilityMutation";
import { useUpdateFacilityMutation } from "./facilities/ui/hooks/useUpdateFacilityMutation";
import { useUsersQuery } from "./users/ui/hooks/useUsersQuery";
import { dashboardSummaryKey, useDashboardSummary } from "./dashboard/ui/useDashboardSummary";

type QueryOptions = {
  queryKey: unknown;
  queryFn: () => unknown;
  enabled?: boolean;
  staleTime?: number;
  retry?: number;
};
type MutationOptions = {
  mutationFn: (value: never) => unknown;
  onSuccess?: (...args: never[]) => unknown;
  onError?: (...args: never[]) => unknown;
};

const latestQuery = () => mocks.useQuery.mock.calls.at(-1)?.[0] as QueryOptions;
const latestMutation = () => mocks.useMutation.mock.calls.at(-1)?.[0] as MutationOptions;

describe("React Query hook contracts", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      if (typeof mock === "function" && "mockClear" in mock) mock.mockClear();
    }
  });

  it("configures audit report keys, enablement, options and fetch", async () => {
    mocks.getReport.mockResolvedValue({ id: "report" });
    useAuditReport("audit-1", { enabled: false, retry: 3 });
    expect(auditReportKey("audit-1")).toEqual(["reports", "by-audit", "audit-1"]);
    expect(latestQuery()).toMatchObject({
      queryKey: ["reports", "by-audit", "audit-1"],
      enabled: false,
      staleTime: 300_000,
      retry: 3,
    });
    await latestQuery().queryFn();
    expect(mocks.getReport).toHaveBeenCalledWith("audit-1");
    useAuditReport();
    expect(latestQuery()).toMatchObject({ enabled: false, queryKey: ["reports", "by-audit", ""] });
  });

  it("configures report detail factories and rejects a missing id", async () => {
    mocks.fetchReportById.mockResolvedValue({ id: "report-1" });
    expect(reportByIdQueryKey("report-1")).toEqual(["report-download", "report-1"]);
    const factory = createReportByIdQueryOptions("report-1");
    await (factory.queryFn as () => unknown)();
    expect(mocks.fetchReportById).toHaveBeenCalledWith(expect.anything(), "report-1");

    useReportByIdQuery({ id: "report-1" });
    expect(latestQuery()).toMatchObject({ enabled: true, queryKey: ["report-download", "report-1"] });
    await latestQuery().queryFn();
    useReportByIdQuery({ enabled: true });
    expect(latestQuery()).toMatchObject({ enabled: false, queryKey: ["report-download", "pending"] });
    expect(() => latestQuery().queryFn()).toThrow("Report id is required");
  });

  it("configures filtered and unfiltered report lists", async () => {
    mocks.fetchReports.mockResolvedValue({ items: [] });
    expect(reportsListQueryKey()).toEqual(["reports", {}]);
    expect(reportsListQueryKey({ limit: 5 })).toEqual(["reports", { limit: 5 }]);
    const factory = createReportsListQueryOptions({ limit: 5 });
    await (factory.queryFn as () => unknown)();
    expect(mocks.fetchReports).toHaveBeenCalledWith(expect.anything(), { limit: 5 });
    useReportsListQuery();
    expect(latestQuery()).toMatchObject({ queryKey: ["reports", {}], enabled: true });
    useReportsListQuery({ limit: 10, enabled: false });
    expect(latestQuery()).toMatchObject({ queryKey: ["reports", { limit: 10 }], enabled: false });
  });

  it("archives and restores reports then invalidates report queries", async () => {
    mocks.deleteReport.mockResolvedValue(undefined);
    useDeleteReport();
    await latestMutation().mutationFn("report-1" as never);
    await latestMutation().onSuccess?.();
    expect(mocks.deleteReport).toHaveBeenCalledWith("report-1");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reports"] });

    useRestoreReport();
    await latestMutation().mutationFn("report-1" as never);
    await latestMutation().onSuccess?.();
    expect(mocks.restoreReport).toHaveBeenCalledWith("report-1");
  });

  it("configures all project queries and mutations", async () => {
    useProjectsQuery({ status: "ACTIVE" });
    expect(latestQuery()).toMatchObject({
      queryKey: ["projects", { status: "ACTIVE" }],
      staleTime: 300_000,
      retry: 2,
    });
    await latestQuery().queryFn();
    expect(mocks.fetchProjects).toHaveBeenCalledWith(expect.anything(), { status: "ACTIVE" });

    useCreateProjectMutation();
    await latestMutation().mutationFn({ name: "Project" } as never);
    await latestMutation().onSuccess?.();
    expect(mocks.createProject).toHaveBeenCalledWith(expect.anything(), { name: "Project" });

    useUpdateProjectMutation();
    await latestMutation().mutationFn({ id: "project-1" } as never);
    await latestMutation().onSuccess?.();
    expect(mocks.updateProject).toHaveBeenCalledWith(expect.anything(), { id: "project-1" });

    useArchiveProjectMutation();
    await latestMutation().mutationFn({ id: "project-1" } as never);
    await latestMutation().onSuccess?.({} as never, { id: "project-1" } as never);
    expect(mocks.archiveProject).toHaveBeenCalledWith({ id: "project-1" });
  });

  it("runs project delete callbacks on success and error", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    useDeleteProjectMutation({ onSuccess, onError });
    await latestMutation().mutationFn("project-1" as never);
    await latestMutation().onSuccess?.(undefined as never, "project-1" as never, undefined as never);
    const error = { code: "CONFLICT", message: "Conflict" };
    latestMutation().onError?.(error as never, "project-1" as never, undefined as never);
    expect(mocks.deleteProject).toHaveBeenCalledWith("project-1");
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("configures facility list and lifecycle mutations", async () => {
    useFacilitiesQuery({ projectId: "project-1" }, false);
    expect(latestQuery()).toMatchObject({
      queryKey: ["facilities", { projectId: "project-1" }],
      enabled: false,
      retry: 2,
    });
    await latestQuery().queryFn();
    expect(mocks.getFacilities).toHaveBeenCalledWith({ projectId: "project-1" });

    const cases = [
      [useArchiveFacilityMutation, mocks.archiveFacility],
      [useCreateFacilityMutation, mocks.createFacility],
      [useDeleteFacilityMutation, mocks.deleteFacility],
    ] as const;
    for (const [hook, operation] of cases) {
      hook();
      await latestMutation().mutationFn("value" as never);
      await latestMutation().onSuccess?.({ id: "facility-1" } as never);
      expect(operation).toHaveBeenCalledWith("value");
    }

    useRestoreFacilityMutation();
    await latestMutation().mutationFn("facility-1" as never);
    await latestMutation().onSuccess?.();
    expect(mocks.restoreFacility).toHaveBeenCalledWith("facility-1");

    useUpdateFacilityMutation();
    await latestMutation().mutationFn({ id: "facility-1" } as never);
    await latestMutation().onSuccess?.({ id: "facility-1" } as never);
    expect(mocks.updateFacility).toHaveBeenCalledWith({ id: "facility-1" });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["facility", "facility-1"] });
  });

  it("configures users and dashboard queries", async () => {
    useUsersQuery({ role: "auditor" } as never, false);
    expect(latestQuery()).toMatchObject({
      queryKey: ["users", { role: "auditor" }],
      enabled: false,
      staleTime: 300_000,
    });
    await latestQuery().queryFn();
    expect(mocks.getUsers).toHaveBeenCalledWith({ role: "auditor" });

    useDashboardSummary({ enabled: false });
    expect(dashboardSummaryKey).toEqual(["dashboard", "summary"]);
    expect(latestQuery()).toMatchObject({
      queryKey: ["dashboard", "summary"],
      enabled: false,
      staleTime: 60_000,
      retry: 2,
    });
    await latestQuery().queryFn();
    expect(mocks.getDashboardSummary).toHaveBeenCalledOnce();
  });
});
