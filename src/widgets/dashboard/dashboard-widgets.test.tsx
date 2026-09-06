import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ActivityItem from "./ActivityItem";
import DashboardActivitySection from "./DashboardActivitySection";
import DashboardMetrics from "./DashboardMetrics";
import MetricCard from "./MetricCard";
import UsersMetrics from "../../features/users/ui/UsersMetrics";

afterEach(cleanup);

describe("dashboard widgets", () => {
  it.each(["success", "warning", "info", "danger", "neutral"] as const)(
    "renders %s activity",
    (variant) => {
      render(
        <ActivityItem
          project="Project Alpha"
          auditor="Alice"
          time="2 minutes ago"
          variant={variant}
          data-testid="activity"
        />
      );
      expect(screen.getByTestId("activity")).toHaveTextContent(
        "Project Alpha audit completed by Alice"
      );
      expect(screen.getByText("2 minutes ago")).toBeInTheDocument();
    }
  );

  it("renders the empty activity state with default copy", () => {
    render(<DashboardActivitySection items={[]} data-testid="activity-section" />);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("Latest audits completed by auditors")).toBeInTheDocument();
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("renders activity items with custom copy", () => {
    render(
      <DashboardActivitySection
        title="Updates"
        subtitle="Today"
        items={[
          { project: "One", auditor: "Alice", time: "Now", variant: "success" },
          { project: "Two", auditor: "Bob", time: "Yesterday", variant: "warning" },
        ]}
      />
    );
    expect(screen.getByText("Updates")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders a metric without optional icon or subtitle", () => {
    render(<MetricCard title="Audits" value={5} data-testid="metric" />);
    expect(screen.getByTestId("metric")).toHaveTextContent("Audits5");
  });

  it("renders every supported serialized icon and metric subtitles", () => {
    const icons = [
      "file-text",
      "bar-chart-3",
      "check-circle-2",
      "user-plus",
      "shield-check",
      "badge-check",
      "brief-case",
      "building",
      "alert-circle",
      "file-check",
      "clock",
      "eye",
      "send",
    ] as const;
    render(
      <DashboardMetrics
        className="custom-grid"
        data-testid="metrics"
        items={icons.map((icon, index) => ({
          title: `Metric ${index}`,
          value: index,
          subtitle: `Subtitle ${index}`,
          icon,
          "data-testid": `metric-${index}`,
        }))}
      />
    );
    expect(screen.getByTestId("metrics")).toHaveClass("custom-grid");
    expect(screen.getAllByText(/Subtitle /)).toHaveLength(13);
    expect(screen.getByTestId("metric-12")).toHaveTextContent("Metric 12");
  });

  it("maps user metrics to the four domain cards", () => {
    render(
      <UsersMetrics
        className="users-grid"
        metrics={{ totalUsers: 20, auditors: 8, qcManagers: 4, projectManagers: 3 }}
      />
    );
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Auditors")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("QC Managers")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Project Managers")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
