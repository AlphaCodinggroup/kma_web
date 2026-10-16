import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@entities/projects/model";
import type { Facility } from "@entities/facility/model";
import { ProjectsTable } from "../ProjectsTable";
import ArchivedProjectsTable from "../ArchivedProjectsTable";
import FacilityTable from "@features/facilities/ui/FacilityTable";
import UsersTable from "@features/users/ui/UsersTable";

const state = vi.hoisted(() => ({ compact: true, isAdmin: true }));
vi.mock("@shared/lib/useMediaQuery", () => ({ useMediaQuery: () => state.compact }));
vi.mock("@processes/auth/hooks", () => ({ useSession: () => ({ isAdmin: state.isAdmin }) }));
vi.mock("../ProjectAuditsProgress", () => ({ default: () => <span>2 of 3 audits completed</span> }));

const project: Project = { id: "p-north", name: "North campus", status: "ACTIVE", users: [], facilities: [{ id: "f-north", name: "North building" }], createdBy: "admin", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", archivedAt: "2026-02-01T00:00:00Z" };
const facility: Facility = { id: "f-north", projectId: "p-north", name: "North building", address: "123 Main Street", city: "Boston", status: "ACTIVE", userIds: [], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", createdBy: "admin" };
const base = { isLoading: false, isError: false, onError: vi.fn() };

describe("compact management lists", () => {
  beforeEach(() => { state.compact = true; state.isAdmin = true; });

  it("shows the project identity, status and actions before opening Details", async () => {
    const onEdit = vi.fn();
    const onArchive = vi.fn();
    render(<ProjectsTable {...base} items={[project]} onEdit={onEdit} onDelete={vi.fn()} onArchive={onArchive} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const row = within(screen.getByRole("list", { name: "Projects" }));
    expect(row.getByRole("link", { name: "North campus" })).toHaveAttribute("href", "/projects/p-north");
    expect(row.getByText("Active")).toBeInTheDocument();
    await userEvent.click(row.getByRole("button", { name: "Edit project" }));
    await userEvent.click(row.getByRole("button", { name: "Archive project" }));
    expect(onEdit).toHaveBeenCalledWith("p-north");
    expect(onArchive).toHaveBeenCalledWith("p-north");
    await userEvent.click(row.getByText("Details"));
    expect(row.getByText("North building")).toBeVisible();
  });

  it("offers restore for archived projects and preserves the detail route", async () => {
    const onRestore = vi.fn();
    render(<ArchivedProjectsTable {...base} items={[project]} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: "Restore project" }));
    expect(onRestore).toHaveBeenCalledWith("p-north");
    expect(screen.getByRole("link", { name: "View North campus" })).toHaveAttribute("href", "/projects/p-north");
  });

  it("keeps facility location and archive actions visible and supports compact sorting", async () => {
    const onArchive = vi.fn();
    const second = { ...facility, id: "f-alpha", name: "Alpha building" };
    render(<FacilityTable {...base} items={[facility, second]} onEdit={vi.fn()} onDelete={vi.fn()} onArchive={onArchive} />);
    expect(screen.getAllByText("123 Main Street · Boston")).toHaveLength(2);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort facilities" }), "name");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Alpha building");
    await userEvent.click(within(screen.getAllByRole("listitem")[0]!).getByRole("button", { name: "Archive facility" }));
    expect(onArchive).toHaveBeenCalledWith("f-alpha");
  });

  it("blocks user actions for reviewers and changes to the desktop table at the breakpoint", () => {
    state.isAdmin = false;
    const props = { ...base, items: [{ id: "u-jane", cognitoId: "c-jane", name: "Jane Doe", email: "jane@kma.test", role: "qc" }], onEdit: vi.fn(), onDelete: vi.fn() };
    const { rerender } = render(<UsersTable {...props} />);
    expect(screen.getByText("jane@kma.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit user" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete user" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Delete user" }));
    expect(props.onDelete).not.toHaveBeenCalled();
    state.compact = false;
    rerender(<UsersTable {...props} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Users" })).not.toBeInTheDocument();
  });
});
