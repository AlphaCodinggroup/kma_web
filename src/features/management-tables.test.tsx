import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@processes/auth/hooks", () => ({ useSession: () => ({ isAdmin: mocks.isAdmin }) }));

import { ProjectsTable } from "./projects/ui/ProjectsTable";
import FacilityTable from "./facilities/ui/FacilityTable";

const projects = [
  { id: "p1", name: "Project", users: [{ id: "u1", name: "Alex" }], facilities: [{ id: "f1", name: "Office" }], status: "ACTIVE", createdAt: "2026-01-01T10:00:00Z" },
  { id: "p2", name: "Empty associations", users: [], facilities: [], status: "", createdAt: "invalid" },
] as any[];
const facilities = [
  { id: "f-z", name: "Zulu", address: "Zulu street", city: "Boston", createdAt: "2026-02-01" },
  { id: "f-a", name: "Alpha", address: null, city: "Austin", createdAt: "2026-01-01" },
  { id: "f-none", name: "No address", address: null, city: null, createdAt: null },
] as any[];

describe("project and facility tables", () => {
  beforeEach(() => {
    mocks.isAdmin = true;
  });
  afterEach(() => cleanup());

  it("renders project associations and invokes sort and mutation actions", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProjectsTable
        items={projects}
        onEdit={onEdit}
        onDelete={onDelete}
        onArchive={vi.fn()}
        isLoading={false}
        isError={false}
        onError={vi.fn()}
        onSort={onSort}
        sortField="name"
        sortOrder="asc"
        className="custom-projects"
      />,
    );
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Office")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    for (const name of ["Project", "Auditor", "Facility", "Status", "Created At"]) {
      await user.click(screen.getByRole("button", { name }));
    }
    expect(onSort.mock.calls.map(([field]) => field)).toEqual(["name", "auditor", "facility", "status", "createdAt"]);
    await user.click(screen.getAllByRole("button", { name: "Edit project" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Delete project" })[0]);
    expect(onEdit).toHaveBeenCalledWith("p1");
    expect(onDelete).toHaveBeenCalledWith("p1");
  });

  it("renders each project sort icon state and disables unavailable sorting", () => {
    const props = { items: projects, onEdit: vi.fn(), onDelete: vi.fn(), onArchive: vi.fn(), isLoading: false, isError: false, onError: vi.fn(), onSort: vi.fn() };
    const { rerender } = render(<ProjectsTable {...props} sortField="name" sortOrder="desc" />);
    rerender(<ProjectsTable {...props} sortField="name" sortOrder={null} />);
    const { onSort: _onSort, ...noSortProps } = props;
    rerender(<ProjectsTable {...noSortProps} />);
    expect(screen.getByRole("button", { name: "Project" })).toBeDisabled();
  });

  it("renders project loading, errors, retry and empty state", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const props = { items: [], onEdit: vi.fn(), onDelete: vi.fn(), onArchive: vi.fn(), onError };
    const { rerender } = render(<ProjectsTable {...props} isLoading isError={false} />);
    expect(screen.getByText("Loading projects…")).toBeInTheDocument();
    rerender(<ProjectsTable {...props} isLoading={false} isError />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onError).toHaveBeenCalled();
    rerender(<ProjectsTable {...props} isLoading={false} isError={false} emptyMessage="No matching projects" />);
    expect(screen.getByText("No matching projects")).toBeInTheDocument();
  });

  it("prevents viewers from mutating projects", () => {
    mocks.isAdmin = false;
    render(<ProjectsTable items={[projects[0]]} onEdit={vi.fn()} onDelete={vi.fn()} onArchive={vi.fn()} isLoading={false} isError={false} onError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit project" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete project" })).toBeDisabled();
  });

  it("sorts facilities by name, address and creation date", async () => {
    const user = userEvent.setup();
    render(<FacilityTable items={facilities} onEdit={vi.fn()} onDelete={vi.fn()} onArchive={vi.fn()} isLoading={false} isError={false} onError={vi.fn()} />);
    const firstName = () => within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0].textContent;
    await user.click(screen.getByRole("button", { name: "Facility" }));
    expect(firstName()).toContain("Alpha");
    await user.click(screen.getByRole("button", { name: "Facility" }));
    expect(firstName()).toContain("Zulu");
    await user.click(screen.getByRole("button", { name: "Facility" }));
    await user.click(screen.getByRole("button", { name: "Address" }));
    expect(firstName()).toContain("No address");
    await user.click(screen.getByRole("button", { name: "Created At" }));
    expect(firstName()).toContain("No address");
  });

  it("runs active and archived facility actions", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onArchive = vi.fn();
    const onRestore = vi.fn();
    const props = { items: [facilities[0]], onEdit, onDelete, onArchive, onRestore, isLoading: false, isError: false, onError: vi.fn() };
    const { rerender } = render(<FacilityTable {...props} />);
    await user.click(screen.getByRole("button", { name: "Edit facility" }));
    await user.click(screen.getByRole("button", { name: "Archive facility" }));
    await user.click(screen.getByRole("button", { name: "Delete facility" }));
    expect(onEdit).toHaveBeenCalledWith("f-z");
    expect(onArchive).toHaveBeenCalledWith("f-z");
    expect(onDelete).toHaveBeenCalledWith("f-z");
    rerender(<FacilityTable {...props} showArchived />);
    expect(screen.queryByRole("button", { name: "Delete facility" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore facility" }));
    expect(onRestore).toHaveBeenCalledWith("f-z");
  });

  it("renders facility loading, retry, empty and viewer states", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const props = { items: [], onEdit: vi.fn(), onDelete: vi.fn(), onArchive: vi.fn(), isLoading: true, isError: false, onError };
    const { rerender } = render(<FacilityTable {...props} />);
    expect(screen.getByText("Loading facilities…")).toBeInTheDocument();
    rerender(<FacilityTable {...props} isLoading={false} isError />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    rerender(<FacilityTable {...props} isLoading={false} emptyMessage="No matching facilities" />);
    expect(screen.getByText("No matching facilities")).toBeInTheDocument();
    mocks.isAdmin = false;
    rerender(<FacilityTable {...props} items={[facilities[0]]} isLoading={false} />);
    for (const name of ["Edit facility", "Archive facility", "Delete facility"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });
});
