/**
 * Barra de búsqueda y filtros del proyecto.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProjectAuditsToolbar, {
  type ProjectAuditsToolbarProps,
} from "../ProjectAuditsToolbar";
import { EMPTY_AUDIT_FILTERS } from "../lib/audit-filters";

function renderToolbar(overrides: Partial<ProjectAuditsToolbarProps> = {}) {
  const props: ProjectAuditsToolbarProps = {
    filters: EMPTY_AUDIT_FILTERS,
    options: {
      facilities: [{ value: "f-1", label: "House 1" }],
      flows: [{ value: "flow-1", label: "Ramps" }],
      statuses: [{ value: "completed", label: "Completed" }],
    },
    onFilterChange: vi.fn(),
    onClear: vi.fn(),
    hasValues: false,
    isFiltering: false,
    shown: 9,
    total: 9,
    ...overrides,
  };
  render(<ProjectAuditsToolbar {...props} />);
  return props;
}

describe("ProjectAuditsToolbar", () => {
  it("reports each filter change", async () => {
    const props = renderToolbar();

    await userEvent.type(screen.getByRole("searchbox", { name: "Search audits" }), "x");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Filter by facility" }), "f-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Filter by flow" }), "flow-1");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Filter by status" }), "completed");

    expect(props.onFilterChange).toHaveBeenCalledWith("query", "x");
    expect(props.onFilterChange).toHaveBeenCalledWith("facility", "f-1");
    expect(props.onFilterChange).toHaveBeenCalledWith("flow", "flow-1");
    expect(props.onFilterChange).toHaveBeenCalledWith("status", "completed");
  });

  it("shows the current values", () => {
    renderToolbar({
      filters: { query: "ramp", facility: "f-1", flow: "", status: "completed" },
    });

    expect(screen.getByRole("searchbox", { name: "Search audits" })).toHaveValue("ramp");
    expect(screen.getByRole("combobox", { name: "Filter by facility" })).toHaveValue("f-1");
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveValue("completed");
  });

  it("hides the clear button and the count without filters", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it("clears and says how many audits are shown while filtering", async () => {
    const props = renderToolbar({ hasValues: true, isFiltering: true, shown: 3 });

    expect(screen.getByText("Showing 3 of 9 audits")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });
});
