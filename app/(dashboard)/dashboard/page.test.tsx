import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ summary: {} as any }));
vi.mock("@features/dashboard/ui/useDashboardSummary", () => ({
  useDashboardSummary: () => mocks.summary,
}));
vi.mock("@widgets/dashboard/DashboardMetrics", () => ({
  default: ({ items }: any) => <div data-testid="dashboard-metrics">{JSON.stringify(items)}</div>,
}));
vi.mock("@widgets/dashboard/DashboardActivitySection", () => ({
  default: ({ items }: any) => <div data-testid="dashboard-activity">{JSON.stringify(items)}</div>,
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  beforeEach(() => {
    mocks.summary = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
  });
  afterEach(() => cleanup());

  it("renders metrics, formatted activity and refreshes", async () => {
    const user = userEvent.setup();
    mocks.summary = {
      data: {
        metrics: {
          totalProjects: 1234,
          totalFacilities: 10,
          totalFacilitiesUnassigned: 2,
          totalAuditsCompleted: 8,
          totalDraftReportsPendingReview: 3,
          totalDraftReportsInReview: 4,
          totalFinalReportsSentToClient: Number.NaN,
        },
        recentActivity: [
          { projectName: "Project", facilityName: "Facility", flowName: "Flow", auditorName: "Alex", completedAt: "2026-01-01T10:30:00Z" },
          { projectName: "P2", facilityName: "F2", flowName: "Flow 2", auditorName: "", completedAt: null },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    render(<DashboardPage />);
    expect(screen.getByTestId("dashboard-metrics")).toHaveTextContent("Totals Projects");
    expect(screen.getByTestId("dashboard-metrics")).toHaveTextContent("Reports Approved");
    expect(screen.getByTestId("dashboard-metrics")).toHaveTextContent('"value":"-"');
    expect(screen.getByTestId("dashboard-activity")).toHaveTextContent("Project | Facility - Flow");
    expect(screen.getByTestId("dashboard-activity")).toHaveTextContent("2026-01-01 10:30");
    expect(screen.getByTestId("dashboard-activity")).toHaveTextContent('"auditor":"-"');
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mocks.summary.refetch).toHaveBeenCalledOnce();
  });

  it("renders metrics and activity skeletons while loading", () => {
    mocks.summary = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<DashboardPage />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(5);
    expect(screen.queryByTestId("dashboard-metrics")).not.toBeInTheDocument();
  });

  it("renders an empty metrics state", () => {
    mocks.summary = { data: { recentActivity: [] }, isLoading: false, isError: false, refetch: vi.fn() };
    render(<DashboardPage />);
    expect(screen.getByText("No metrics available.")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-activity")).toHaveTextContent("[]");
  });

  it("renders and retries an API error", async () => {
    const user = userEvent.setup();
    mocks.summary = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    render(<DashboardPage />);
    expect(screen.getByText("Could not load dashboard.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.summary.refetch).toHaveBeenCalledOnce();
  });
});
