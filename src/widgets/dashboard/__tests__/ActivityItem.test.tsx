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
    { variant: "success", expected: "bg-emerald-500" },
    { variant: "warning", expected: "bg-amber-500" },
    { variant: "info", expected: "bg-sky-500" },
    { variant: "danger", expected: "bg-rose-500" },
    { variant: "neutral", expected: "bg-gray-400" },
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
      "bg-emerald-500"
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
      "bg-gray-400"
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
