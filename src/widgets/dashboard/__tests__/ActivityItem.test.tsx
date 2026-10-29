import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ActivityItem, { type ActivityItemProps } from "../ActivityItem";

type Variant = NonNullable<ActivityItemProps["variant"]>;

// El componente renderiza un <li>, por lo que necesita una lista padre.
function renderItem(props: ActivityItemProps) {
  return render(
    <ul>
      <ActivityItem {...props} />
    </ul>
  );
}

describe("ActivityItem", () => {
  it("separates the project, facility and flow while keeping the author and completion time", () => {
    renderItem({ project: "North Campus", facility: "Library", flow: "Entrances", auditor: "Jane Doe", time: "2026-10-07 15:30" });
    expect(screen.getByText("North Campus")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Entrances")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("2026-10-07 15:30")).toBeInTheDocument();
  });

  it("renders the project, the auditor and the time", () => {
    renderItem({ project: "Plant A", auditor: "Jane Doe", time: "2h ago" });

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Plant A audit completed by Jane Doe");
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("highlights the project and the auditor names", () => {
    renderItem({ project: "Plant A", auditor: "Jane Doe", time: "2h ago" });

    expect(screen.getByText("Plant A")).toHaveClass("font-medium");
    expect(screen.getByText("Jane Doe")).toHaveClass("font-medium");
  });

  const variantCases: Array<{ variant: Variant; expected: string }> = [
    { variant: "success", expected: "bg-[var(--kma-success)]" },
    { variant: "warning", expected: "bg-[var(--kma-warning)]" },
    { variant: "info", expected: "bg-[var(--kma-primary)]" },
    { variant: "danger", expected: "bg-[var(--kma-danger)]" },
    { variant: "neutral", expected: "bg-[var(--kma-muted)]" },
  ];

  it.each(variantCases)(
    "paints the $variant dot with $expected",
    ({ variant, expected }) => {
      const { container } = renderItem({
        project: "Plant A",
        auditor: "Jane Doe",
        time: "2h ago",
        variant,
      });

      const dot = container.querySelector("span[aria-hidden='true']");
      expect(dot).toHaveClass("mt-1", "h-2", "w-2", "rounded-full", expected);
    }
  );

  it("defaults to the success dot when no variant is given", () => {
    const { container } = renderItem({
      project: "Plant A",
      auditor: "Jane Doe",
      time: "2h ago",
    });

    expect(container.querySelector("span[aria-hidden='true']")).toHaveClass(
      "bg-[var(--kma-success)]"
    );
  });

  it("falls back to the neutral dot for an unknown variant", () => {
    const { container } = renderItem({
      project: "Plant A",
      auditor: "Jane Doe",
      time: "2h ago",
      variant: "unknown" as Variant,
    });

    expect(container.querySelector("span[aria-hidden='true']")).toHaveClass(
      "bg-[var(--kma-muted)]"
    );
  });

  it("forwards the data-testid to the list item", () => {
    renderItem({
      project: "Plant A",
      auditor: "Jane Doe",
      time: "2h ago",
      "data-testid": "activity-1",
    });

    expect(screen.getByTestId("activity-1").tagName).toBe("LI");
  });

  // Cadenas vacías: el item sigue renderizando su estructura.
  it("renders the structure even with empty strings", () => {
    renderItem({ project: "", auditor: "", time: "" });

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("audit completed by");
    expect(item.querySelectorAll("p")).toHaveLength(2);
  });
});
