import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DashboardActivitySection, { type Activity } from "../DashboardActivitySection";

const items: Activity[] = [
  { project: "Plant A", auditor: "Jane Doe", time: "2h ago", variant: "success" },
  { project: "Plant B", auditor: "John Roe", time: "1d ago", variant: "warning" },
];

describe("DashboardActivitySection", () => {
  it("renders the default title and subtitle", () => {
    render(<DashboardActivitySection items={items} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Recent Activity" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Latest audits completed by auditors")
    ).toBeInTheDocument();
  });

  it("honours a custom title and subtitle", () => {
    render(
      <DashboardActivitySection
        items={items}
        title="Latest audits"
        subtitle="Only this week"
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Latest audits" })
    ).toBeInTheDocument();
    expect(screen.getByText("Only this week")).toBeInTheDocument();
  });

  it("renders one list item per activity", () => {
    render(<DashboardActivitySection items={items} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Plant A")).toBeInTheDocument();
    expect(screen.getByText("Plant B")).toBeInTheDocument();
  });

  it("passes the variant down to each activity dot", () => {
    const { container } = render(<DashboardActivitySection items={items} />);

    const dots = container.querySelectorAll("span[aria-hidden='true']");
    expect(dots[0]).toHaveClass("bg-emerald-500");
    expect(dots[1]).toHaveClass("bg-amber-500");
  });

  it("renders the empty state when the list is empty", () => {
    render(<DashboardActivitySection items={[]} />);

    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  // Comportamiento actual: items ausente también cae en el estado vacío.
  it("renders the empty state when items is missing", () => {
    render(
      <DashboardActivitySection
        items={undefined as unknown as Activity[]}
      />
    );

    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("forwards the data-testid to the card root", () => {
    render(
      <DashboardActivitySection items={items} data-testid="activity-section" />
    );

    expect(screen.getByTestId("activity-section")).toHaveClass(
      "rounded-2xl",
      "bg-white"
    );
  });

  it("renders activities sharing the same project name", () => {
    render(
      <DashboardActivitySection
        items={[
          { project: "Plant A", auditor: "Jane", time: "1h", variant: "info" },
          { project: "Plant A", auditor: "John", time: "2h", variant: "info" },
        ]}
      />
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("Plant A")).toHaveLength(2);
  });
});
