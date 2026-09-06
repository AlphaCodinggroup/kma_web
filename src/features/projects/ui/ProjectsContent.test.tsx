import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  projectsQuery: {} as any,
  usersQuery: {} as any,
  facilitiesQuery: {} as any,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  archive: vi.fn(),
  deleteOptions: undefined as any,
  createPending: false,
  updatePending: false,
  deletePending: false,
  archivePending: false,
  createError: null as Error | null,
  updateError: null as Error | null,
}));
vi.mock("@features/projects/ui/hooks/useProjectsQuery", () => ({ useProjectsQuery: () => mocks.projectsQuery }));
vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({ useUsersQuery: () => mocks.usersQuery }));
vi.mock("@features/facilities/ui/hooks/useFacilitiesQuery", () => ({ useFacilitiesQuery: () => mocks.facilitiesQuery }));
vi.mock("@features/projects/ui/hooks/useCreateProjectMutation", () => ({ useCreateProjectMutation: () => ({ mutateAsync: mocks.create, isPending: mocks.createPending, error: mocks.createError }) }));
vi.mock("@features/projects/ui/hooks/useUpdateProjectMutation", () => ({ useUpdateProjectMutation: () => ({ mutateAsync: mocks.update, isPending: mocks.updatePending, error: mocks.updateError }) }));
vi.mock("@features/projects/ui/hooks/useArchiveProjectMutation", () => ({ useArchiveProjectMutation: () => ({ mutateAsync: mocks.archive, isPending: mocks.archivePending }) }));
vi.mock("@features/projects/ui/hooks/useDeleteProjectMutation", () => ({
  useDeleteProjectMutation: (options: any) => {
    mocks.deleteOptions = options;
    return { mutate: mocks.remove, isPending: mocks.deletePending };
  },
}));
vi.mock("@shared/lib/useDebouncedSearch", () => ({ useDebouncedSearch: (value: string) => value }));
vi.mock("@features/projects/ui/ProjectsSearchCard", () => ({
  default: ({ total, query, onQueryChange, onCreateClick, children }: any) => (
    <section data-testid="project-search" data-total={total}>
      <input aria-label="Project search" value={query} onChange={(event) => onQueryChange(event.target.value)} />
      <button onClick={onCreateClick}>Create project</button>
      {children}
    </section>
  ),
}));
vi.mock("@features/projects/ui/ProjectsTable", () => ({
  ProjectsTable: (props: any) => (
    <div data-testid="projects-table" data-items={props.items.map((item: any) => item.id).join(",")} data-sort={`${props.sortField}:${props.sortOrder}`} data-loading={props.isLoading} data-error={props.isError}>
      <button onClick={props.onError}>Reload projects</button>
      <button onClick={() => props.onSort("name")}>Sort name</button>
      <button onClick={() => props.onSort("auditor")}>Sort auditor</button>
      <button onClick={() => props.onSort("facility")}>Sort facility</button>
      <button onClick={() => props.onSort("status")}>Sort status</button>
      <button onClick={() => props.onSort("createdAt")}>Sort date</button>
      <button onClick={() => props.onEdit("p1")}>Edit project</button>
      <button onClick={() => props.onEdit("missing")}>Edit missing</button>
      <button onClick={() => props.onDelete("p1")}>Delete project</button>
      <button onClick={() => props.onArchive("p1")}>Archive project</button>
    </div>
  ),
}));
vi.mock("@features/projects/ui/CreateProjectDialog", () => ({
  default: ({ open, onOpenChange, onSubmit, facilities, auditors, loading, error }: any) => open ? (
    <div data-testid="create-project-dialog" data-facilities={facilities.length} data-auditors={auditors.length} data-loading={loading} data-error={error ?? ""}>
      <button onClick={() => onSubmit({ name: "New project", description: "Description", auditorIds: ["u1", "missing"], facilityIds: ["f1", "f2", "missing"] })}>Submit project</button>
      <button onClick={() => onOpenChange(false)}>Cancel create</button>
    </div>
  ) : null,
}));
vi.mock("@features/projects/ui/EditProjectDialog", () => ({
  default: ({ open, onOpenChange, onSubmit, project, facilities, auditors, loading, error }: any) => open ? (
    <div data-testid="edit-project-dialog" data-project={project.id} data-facilities={facilities.length} data-auditors={auditors.length} data-loading={loading} data-error={error ?? ""}>
      <button onClick={() => onSubmit({ id: project.id, name: "Updated project", auditorIds: ["u1"], facilityIds: ["f2"] })}>Submit edit</button>
      <button onClick={() => onOpenChange(false)}>Cancel edit</button>
    </div>
  ) : null,
}));
vi.mock("@shared/ui/confirm-dialog", () => ({
  default: ({ open, title, onOpenChange, onConfirm, confirmLabel, loading }: any) => open ? (
    <div data-testid={`confirm-${String(confirmLabel).toLowerCase()}`} data-loading={loading}>{title}<button onClick={onConfirm}>{confirmLabel}</button><button onClick={() => onOpenChange(false)}>Cancel {confirmLabel}</button></div>
  ) : null,
}));

import { ProjectsContent } from "./ProjectsContent";

const projects = [
  { id: "p1", name: "Zulu", status: "ACTIVE", createdAt: "2026-02-01", users: [{ id: "u1", name: "Zoe" }], facilities: [{ id: "f1", name: "Zulu facility" }] },
  { id: "p2", name: "Alpha", status: "ACTIVE", createdAt: "2026-01-01", users: [{ id: "u2", name: "Amy" }], facilities: [{ id: "f2", name: "Alpha facility" }] },
];

describe("ProjectsContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectsQuery = { data: { items: projects }, isLoading: false, isError: false, refetch: vi.fn() };
    mocks.usersQuery = { data: { items: [{ id: "u1", name: "", email: "auditor@example.com", role: "auditor" }] } };
    mocks.facilitiesQuery = { data: { items: [{ id: "f1", name: "Duplicate" }, { id: "f2", name: "Alpha facility" }] } };
    mocks.createPending = false;
    mocks.updatePending = false;
    mocks.createError = null;
    mocks.updateError = null;
    mocks.create.mockResolvedValue({});
    mocks.update.mockResolvedValue({});
    mocks.archive.mockResolvedValue({});
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("filters by scalar, auditor and facility fields", async () => {
    const user = userEvent.setup();
    render(<ProjectsContent />);
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "p1,p2");
    await user.type(screen.getByRole("textbox", { name: "Project search" }), "amy");
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "p2");
    await user.clear(screen.getByRole("textbox", { name: "Project search" }));
    await user.type(screen.getByRole("textbox", { name: "Project search" }), "zulu facility");
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "p1");
  });

  it("cycles sorting and covers all sort fields", async () => {
    const user = userEvent.setup();
    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Sort name" }));
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "p2,p1");
    await user.click(screen.getByRole("button", { name: "Sort name" }));
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "p1,p2");
    await user.click(screen.getByRole("button", { name: "Sort name" }));
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-sort", "null:null");
    for (const name of ["Sort auditor", "Sort facility", "Sort status", "Sort date"]) {
      await user.click(screen.getByRole("button", { name }));
    }
  });

  it("creates through its button and imperative parent trigger", async () => {
    const user = userEvent.setup();
    const triggerRef = React.createRef<(() => void) | undefined>() as React.MutableRefObject<(() => void) | undefined>;
    render(<ProjectsContent createTriggerRef={triggerRef} />);
    triggerRef.current?.();
    expect(await screen.findByTestId("create-project-dialog")).toHaveAttribute("data-facilities", "2");
    await user.click(screen.getByRole("button", { name: "Submit project" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      name: "New project",
      status: "ACTIVE",
      users: [{ id: "u1", name: "auditor@example.com" }],
      facilities: [{ id: "f1", name: "Duplicate" }, { id: "f2", name: "Alpha facility" }],
    })));
    expect(mocks.projectsQuery.refetch).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(screen.getByTestId("create-project-dialog")).toBeInTheDocument();
  });

  it("edits and closes an existing project", async () => {
    const user = userEvent.setup();
    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Edit project" }));
    expect(screen.getByTestId("edit-project-dialog")).toHaveAttribute("data-project", "p1");
    await user.click(screen.getByRole("button", { name: "Submit edit" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: "p1", name: "Updated project" })));
    expect(screen.queryByTestId("edit-project-dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit missing" }));
    expect(screen.queryByTestId("edit-project-dialog")).not.toBeInTheDocument();
  });

  it("deletes after confirmation and closes on mutation success", async () => {
    const user = userEvent.setup();
    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Delete project" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(mocks.remove).toHaveBeenCalledWith("p1");
    act(() => mocks.deleteOptions.onSuccess());
    expect(screen.queryByTestId("confirm-delete")).not.toBeInTheDocument();
  });

  it("archives and visibly reports archive and delete failures", async () => {
    const user = userEvent.setup();
    mocks.archive.mockRejectedValueOnce(new Error("Archive conflict"));
    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Archive project" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Archive conflict");
    act(() => mocks.deleteOptions.onError(new Error("Delete conflict")));
    expect(screen.getByRole("alert")).toHaveTextContent("Delete conflict");
  });

  it("forwards loading, error and mutation states", async () => {
    const user = userEvent.setup();
    mocks.projectsQuery = { data: undefined, isLoading: true, isError: true, refetch: vi.fn() };
    mocks.createPending = true;
    mocks.createError = new Error("Create failed");
    render(<ProjectsContent />);
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-error", "true");
    await user.click(screen.getByRole("button", { name: "Reload projects" }));
    expect(mocks.projectsQuery.refetch).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(screen.getByTestId("create-project-dialog")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("create-project-dialog")).toHaveAttribute("data-error", "Create failed");
  });

  it("survives empty lookups and projects without associations", async () => {
    const user = userEvent.setup();
    mocks.usersQuery = { data: undefined };
    mocks.facilitiesQuery = { data: undefined };
    mocks.projectsQuery = {
      data: { items: [{ id: "p3", name: "Bare" }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(screen.getByTestId("create-project-dialog")).toHaveAttribute("data-facilities", "0");
    expect(screen.getByTestId("create-project-dialog")).toHaveAttribute("data-auditors", "0");

    await user.type(screen.getByRole("textbox", { name: "Project search" }), "bare");
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "p3");
    await user.clear(screen.getByRole("textbox", { name: "Project search" }));
    await user.type(screen.getByRole("textbox", { name: "Project search" }), "nothing");
    expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "");
  });

  it("sorts descending and keeps equal rows stable on every field", async () => {
    const user = userEvent.setup();
    mocks.projectsQuery = {
      data: {
        items: [
          { id: "p1", name: "Alpha", status: "ACTIVE", createdAt: "2026-01-01", users: [{ id: "u1", name: "Amy" }], facilities: [{ id: "f1", name: "Alpha facility" }] },
          { id: "p2", name: "Alpha", status: "ACTIVE", createdAt: "2026-01-01", users: [{ id: "u2", name: "Amy" }], facilities: [{ id: "f2", name: "Alpha facility" }] },
          { id: "p3" },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<ProjectsContent />);
    for (const name of ["Sort name", "Sort auditor", "Sort facility", "Sort status", "Sort date"]) {
      await user.click(screen.getByRole("button", { name }));
      expect(screen.getByTestId("projects-table")).toHaveAttribute("data-sort", expect.anything());
      await user.click(screen.getByRole("button", { name }));
      expect(screen.getByTestId("projects-table")).toHaveAttribute("data-items", "p1,p2,p3");
      await user.click(screen.getByRole("button", { name }));
    }
  });

  it("falls back to the auditor id when there is neither name nor email", async () => {
    const user = userEvent.setup();
    mocks.usersQuery = { data: { items: [{ id: "u1", name: "   ", role: "auditor" }] } };

    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Create project" }));
    await user.click(screen.getByRole("button", { name: "Submit project" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ users: [{ id: "u1", name: "u1" }] }),
      ),
    );
  });

  it("keeps the dialog open when the creation or the update fails", async () => {
    const user = userEvent.setup();
    mocks.create.mockRejectedValueOnce(new Error("Create conflict"));
    mocks.update.mockRejectedValueOnce(new Error("Update conflict"));

    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Create project" }));
    await user.click(screen.getByRole("button", { name: "Submit project" }));
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith("Failed to create project", expect.any(Error)),
    );
    expect(screen.getByTestId("create-project-dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel create" }));
    await user.click(screen.getByRole("button", { name: "Edit project" }));
    await user.click(screen.getByRole("button", { name: "Submit edit" }));
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith("Failed to update project", expect.any(Error)),
    );
    expect(screen.getByTestId("edit-project-dialog")).toBeInTheDocument();
  });

  it("ignores archive and delete requests for a row that is gone", async () => {
    const user = userEvent.setup();
    render(<ProjectsContent />);

    await user.click(screen.getByRole("button", { name: "Edit missing" }));
    expect(screen.queryByTestId("edit-project-dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-archive")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-delete")).not.toBeInTheDocument();
  });

  it("names an unnamed project in the archive confirmation and reports a plain failure", async () => {
    const user = userEvent.setup();
    mocks.archive.mockRejectedValueOnce("plain rejection");
    mocks.projectsQuery = {
      data: { items: [{ id: "p1" }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };

    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Archive project" }));
    expect(screen.getByTestId("confirm-archive")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to archive project.");
  });

  it("reports a plain delete rejection", async () => {
    const user = userEvent.setup();
    render(<ProjectsContent />);

    await user.click(screen.getByRole("button", { name: "Delete project" }));
    act(() => mocks.deleteOptions.onError("plain rejection"));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to delete project.");
  });

  it("forwards the update error to the edit dialog", async () => {
    const user = userEvent.setup();
    mocks.updateError = new Error("Update failed");
    mocks.updatePending = true;

    render(<ProjectsContent />);
    await user.click(screen.getByRole("button", { name: "Edit project" }));
    expect(screen.getByTestId("edit-project-dialog")).toHaveAttribute("data-error", "Update failed");
    expect(screen.getByTestId("edit-project-dialog")).toHaveAttribute("data-loading", "true");
  });
});
