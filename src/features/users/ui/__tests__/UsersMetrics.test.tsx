import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UsersMetrics, { type UsersMetricsProps } from "../UsersMetrics";

const metrics: UsersMetricsProps["metrics"] = {
  totalUsers: 12,
  auditors: 5,
  qcManagers: 3,
  projectManagers: 4,
};

describe("UsersMetrics", () => {
  it("renders the four fixed metric cards", () => {
    render(<UsersMetrics metrics={metrics} />);

    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("Auditors")).toBeInTheDocument();
    expect(screen.getByText("QC Managers")).toBeInTheDocument();
    expect(screen.getByText("Project Managers")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
  });

  it("renders every metric value", () => {
    render(<UsersMetrics metrics={metrics} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  // Los ceros son valores válidos: las cuatro tarjetas deben mostrar "0".
  it("renders zeroed metrics as values", () => {
    render(
      <UsersMetrics
        metrics={{
          totalUsers: 0,
          auditors: 0,
          qcManagers: 0,
          projectManagers: 0,
        }}
      />
    );

    expect(screen.getAllByText("0")).toHaveLength(4);
  });

  it("renders one decorative icon per card", () => {
    const { container } = render(<UsersMetrics metrics={metrics} />);

    const icons = container.querySelectorAll("svg[aria-hidden='true']");
    expect(icons).toHaveLength(4);
  });

  it("applies the four column responsive grid", () => {
    const { container } = render(<UsersMetrics metrics={metrics} />);

    expect(container.firstElementChild).toHaveClass(
      "grid",
      "gap-4",
      "md:grid-cols-2",
      "lg:grid-cols-4"
    );
  });

  it("appends a custom className", () => {
    const { container } = render(
      <UsersMetrics metrics={metrics} className="metrics-extra" />
    );

    expect(container.firstElementChild).toHaveClass("metrics-extra", "grid");
  });

  it("renders repeated values without collapsing the cards", () => {
    render(
      <UsersMetrics
        metrics={{
          totalUsers: 2,
          auditors: 2,
          qcManagers: 2,
          projectManagers: 2,
        }}
      />
    );

    expect(screen.getAllByText("2")).toHaveLength(4);
  });
});
