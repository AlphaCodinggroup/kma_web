import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuditsFilters, { AUDIT_STATUS_FILTER_OPTIONS, toAuditStatusFilter } from "../AuditsFilters";

const base = {
  auditorFilter: "",
  statusFilter: "",
  onAuditorChange: vi.fn(),
  onStatusChange: vi.fn(),
  onClearFilters: vi.fn(),
  availableAuditors: [],
};

describe("AuditsFilters", () => {
  it("hides the clear button when nothing is filtered or searched", () => {
    render(<AuditsFilters {...base} />);
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("shows the clear button when only the search text is set, because clearing also empties the search", async () => {
    const onClearFilters = vi.fn();
    render(<AuditsFilters {...base} onClearFilters={onClearFilters} searchActive />);
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it.each([{ auditorFilter: "jane" }, { statusFilter: "completed" }])("shows the clear button for %o", (filters) => {
    render(<AuditsFilters {...base} {...filters} />);
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });
});

describe("toAuditStatusFilter", () => {
  it.each(AUDIT_STATUS_FILTER_OPTIONS.map((option) => option.value))("keeps the offered value %p", (value) => {
    expect(toAuditStatusFilter(value)).toBe(value);
  });

  it.each(["deleted", "unknown", "COMPLETED", "nope", " "])("turns the unoffered value %p into «all»", (value) => {
    expect(toAuditStatusFilter(value)).toBe("");
  });
});
