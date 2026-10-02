/**
 * ProjectsContent: vista de proyectos archivados (toggle) y restauración.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@entities/projects/model";

const state = {
  active: [] as Project[],
  archived: [] as Project[],
  isAdmin: true,
  restoreError: null as { message: string } | null,
  isRestoring: false,
};

const projectsQuerySpy = vi.fn();
const refetchMock = vi.fn();
const restoreMock = vi.fn();
const resetRestoreMock = vi.fn();

vi.mock("@shared/lib/useDebouncedSearch", () => ({
  useDebouncedSearch: (query: string) => {
    const normalized = query.trim().toLowerCase();
    return normalized.length >= 2 ? normalized : "";
  },
}));

vi.mock("@features/projects/ui/hooks/useProjectsQuery", () => ({
  useProjectsQuery: (filters?: { status?: string }) => {
    projectsQuerySpy(filters);
    const items = filters?.status === "ARCHIVED" ? state.archived : state.active;
    return { data: { items }, isLoading: false, isError: false, refetch: refetchMock };
  },
}));

vi.mock("@features/users/ui/hooks/useUsersQuery", () => ({
  useUsersQuery: () => ({ data: undefined }),
}));
vi.mock("@features/facilities/ui/hooks/useFacilitiesQuery", () => ({
  useFacilitiesQuery: () => ({ data: undefined }),
}));
vi.mock("@features/projects/ui/hooks/useCreateProjectMutation", () => ({
  useCreateProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));
vi.mock("@features/projects/ui/hooks/useUpdateProjectMutation", () => ({
  useUpdateProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));
vi.mock("@features/projects/ui/hooks/useDeleteProjectMutation", () => ({
  useDeleteProjectMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@features/projects/ui/hooks/useArchiveProjectMutation", () => ({
  useArchiveProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@features/projects/ui/hooks/useRestoreProjectMutation", () => ({
  useRestoreProjectMutation: () => ({
    mutateAsync: restoreMock,
    isPending: state.isRestoring,
    error: state.restoreError,
    reset: resetRestoreMock,
  }),
}));
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({ isAdmin: state.isAdmin }),
}));
vi.mock("@features/projects/ui/ProjectAuditsProgress", () => ({
  default: ({ projectId }: { projectId: string }) => (
    <span data-testid={`progress-${projectId}`}>progress</span>
  ),
}));

import { ProjectsContent } from "../ProjectsContent";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "p-1",
  name: "Project One",
  status: "ACTIVE",
  users: [],
  facilities: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  createdBy: "admin",
  ...overrides,
});

const archivedComplejos = makeProject({
  id: "p-arch-1",
  name: "Complejos Apartamentos",
  status: "ARCHIVED",
  archivedAt: "2026-08-15T12:00:00Z",
});
const archivedDuxbury = makeProject({
  id: "p-arch-2",
  name: "Duxbury SETP",
  status: "ARCHIVED",
  archivedAt: "2026-07-22T12:00:00Z",
});

beforeEach(() => {
  vi.clearAllMocks();
  state.active = [makeProject({ id: "p-act", name: "Active Tower" })];
  state.archived = [archivedComplejos, archivedDuxbury];
  state.isAdmin = true;
  state.restoreError = null;
  state.isRestoring = false;
  restoreMock.mockResolvedValue(makeProject());
});

async function showArchived() {
  await userEvent.click(screen.getByRole("button", { name: "Show archived projects" }));
}

describe("ProjectsContent — archived view", () => {
  it("lists the active projects by default and asks the backend only for them", () => {
    render(<ProjectsContent />);

    expect(screen.getByText("Active Tower")).toBeInTheDocument();
    expect(screen.getByText("Total projects: 1")).toBeInTheDocument();
    expect(projectsQuerySpy).toHaveBeenLastCalledWith({ status: "ACTIVE" });
  });

  it("switches to the archived projects with the toggle", async () => {
    render(<ProjectsContent />);

    await showArchived();

    expect(projectsQuerySpy).toHaveBeenLastCalledWith({ status: "ARCHIVED" });
    expect(screen.getByText("Archived projects: 2")).toBeInTheDocument();
    expect(screen.getByText("Complejos Apartamentos")).toBeInTheDocument();
    expect(screen.getByText("Duxbury SETP")).toBeInTheDocument();
    expect(screen.queryByText("Active Tower")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Archived" })).toBeInTheDocument();
    expect(screen.getByTestId("progress-p-arch-1")).toBeInTheDocument();
  });

  it("goes back to the active projects", async () => {
    render(<ProjectsContent />);
    await showArchived();

    await userEvent.click(screen.getByRole("button", { name: "Show active projects" }));

    expect(projectsQuerySpy).toHaveBeenLastCalledWith({ status: "ACTIVE" });
    expect(screen.getByText("Active Tower")).toBeInTheDocument();
  });

  it("searches among the archived projects", async () => {
    render(<ProjectsContent />);
    await showArchived();

    await userEvent.type(screen.getByLabelText("Search projects"), "dux");

    await waitFor(() => expect(screen.queryByText("Complejos Apartamentos")).not.toBeInTheDocument());
    expect(screen.getByText("Duxbury SETP")).toBeInTheDocument();
  });

  it("shows the empty state when nothing is archived", async () => {
    state.archived = [];
    render(<ProjectsContent />);

    await showArchived();

    expect(screen.getByText("No archived projects")).toBeInTheDocument();
  });
});

describe("ProjectsContent — restoring a project", () => {
  async function askToRestore(name: string) {
    render(<ProjectsContent />);
    await showArchived();
    const row = screen.getByText(name).closest("tr") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: "Restore project" }));
  }

  it("asks for confirmation before restoring", async () => {
    await askToRestore("Duxbury SETP");

    expect(screen.getByText(/Do you want to restore/)).toHaveTextContent("“Duxbury SETP”");
    expect(restoreMock).not.toHaveBeenCalled();
    expect(resetRestoreMock).toHaveBeenCalled();
  });

  it("restores the chosen project once confirmed and closes the dialog", async () => {
    await askToRestore("Duxbury SETP");

    await userEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restoreMock).toHaveBeenCalledWith({ id: "p-arch-2" }));
    await waitFor(() => expect(screen.queryByText(/Do you want to restore/)).not.toBeInTheDocument());
  });

  it("does not restore when the dialog is cancelled", async () => {
    await askToRestore("Duxbury SETP");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(restoreMock).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText(/Do you want to restore/)).not.toBeInTheDocument());
  });

  it("keeps the dialog open and shows the backend error when the restore fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    restoreMock.mockRejectedValue({ message: "Project is not archived" });
    state.restoreError = { message: "Project is not archived" };
    await askToRestore("Duxbury SETP");

    await userEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restoreMock).toHaveBeenCalled());
    expect(screen.getByText(/Do you want to restore/)).toBeInTheDocument();
    expect(screen.getByText("Project is not archived")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
