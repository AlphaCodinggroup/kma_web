import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DashboardMetrics, { type DashboardMetricItem } from "../DashboardMetrics";

const items: DashboardMetricItem[] = [
  { title: "Total Audits", value: 12, subtitle: "All time", icon: "file-text" },
  { title: "Completed", value: 0, icon: "check-circle-2" },
  { title: "Pending", value: "—" },
];

describe("DashboardMetrics", () => {
  it("renders one card per item", () => {
    render(<DashboardMetrics items={items} />);

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("renders the title, value and subtitle of every item", () => {
    render(<DashboardMetrics items={items} />);

    expect(screen.getByText("Total Audits")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("All time")).toBeInTheDocument();
  });

  // Un valor en cero es dato válido y debe seguir mostrándose.
  it("renders a zero value", () => {
    render(<DashboardMetrics items={items} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders the placeholder used for an absent value", () => {
    render(<DashboardMetrics items={items} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders an empty grid when the item list is empty", () => {
    const { container } = render(<DashboardMetrics items={[]} />);

    expect(container.firstElementChild?.children).toHaveLength(0);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("applies the responsive grid base classes", () => {
    const { container } = render(<DashboardMetrics items={items} />);

    expect(container.firstElementChild).toHaveClass(
      "grid",
      "gap-4",
      "md:grid-cols-2",
      "lg:grid-cols-3"
    );
  });

  it("appends a custom className to the grid", () => {
    const { container } = render(
      <DashboardMetrics items={items} className="grid-extra" />
    );

    expect(container.firstElementChild).toHaveClass("grid-extra", "grid");
  });

  // Sin className el join no debe dejar un espacio final en el atributo.
  it("keeps the class attribute clean when no className is given", () => {
    const { container } = render(<DashboardMetrics items={items} />);

    expect(container.firstElementChild?.getAttribute("class")).toBe(
      "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    );
  });

  it("forwards the data-testid of the grid and of each card", () => {
    render(
      <DashboardMetrics
        data-testid="metrics-grid"
        items={[
          { title: "Total", value: 1, "data-testid": "metric-total" },
        ]}
      />
    );

    expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
    expect(screen.getByTestId("metric-total")).toBeInTheDocument();
  });

  it("renders items sharing the same title without collapsing them", () => {
    render(
      <DashboardMetrics
        items={[
          { title: "Audits", value: 1 },
          { title: "Audits", value: 2 },
        ]}
      />
    );

    expect(screen.getAllByText("Audits")).toHaveLength(2);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
