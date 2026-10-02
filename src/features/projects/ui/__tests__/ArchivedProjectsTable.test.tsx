/**
 * ArchivedProjectsTable: columnas, fecha de archivado, acciones Ver y
 * Restaurar, permisos y estados de carga, error y vacío.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@entities/projects/model";

const state = { isAdmin: true };

vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({ isAdmin: state.isAdmin }),
}));

// La celda de auditorías tiene sus propias pruebas y consulta la red.
vi.mock("@features/projects/ui/ProjectAuditsProgress", () => ({
  default: ({ projectId }: { projectId: string }) => (
    <span data-testid={`progress-${projectId}`}>progress</span>
  ),
}));

import { ArchivedProjectsTable } from "../ArchivedProjectsTable";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "p-1",
  name: "Complejos Apartamentos",
  status: "ARCHIVED",
  users: [],
  facilities: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-08-15T00:00:00Z",
  createdBy: "admin",
  archivedAt: "2026-08-15T12:30:00Z",
  archivedBy: "system:auto-archive",
  ...overrides,
});

const baseProps = {
  items: [makeProject(), makeProject({ id: "p-2", name: "Duxbury SETP", archivedAt: "2026-07-22T09:00:00Z" })],
  onRestore: vi.fn(),
  isLoading: false,
  isError: false,
  onError: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  state.isAdmin = true;
});

describe("ArchivedProjectsTable", () => {
  it("shows the project, archive date, audits and actions columns", () => {
    render(<ArchivedProjectsTable {...baseProps} />);

    for (const header of ["Project", "Archived", "Audits", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
  });

  it("lists every project with its archive date and audits progress", () => {
    render(<ArchivedProjectsTable {...baseProps} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Complejos Apartamentos")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("2026-08-15")).toBeInTheDocument();
    expect(within(rows[0]!).getByTestId("progress-p-1")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Duxbury SETP")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("2026-07-22")).toBeInTheDocument();
  });

  it("shows a dash when a project has no archive date", () => {
    render(
      <ArchivedProjectsTable
        {...baseProps}
        items={[makeProject({ archivedAt: null })]}
      />
    );

    expect(within(screen.getAllByRole("row")[1]!).getByText("-")).toBeInTheDocument();
  });

  it("links the project name and the View action to its detail", () => {
    render(<ArchivedProjectsTable {...baseProps} />);

    expect(screen.getByRole("link", { name: "Complejos Apartamentos" })).toHaveAttribute(
      "href",
      "/projects/p-1"
    );
    expect(screen.getByRole("link", { name: "View Complejos Apartamentos" })).toHaveAttribute(
      "href",
      "/projects/p-1"
    );
  });

  it("restores the project of the clicked row", async () => {
    render(<ArchivedProjectsTable {...baseProps} />);

    const restoreButtons = screen.getAllByRole("button", { name: "Restore project" });
    await userEvent.click(restoreButtons[1]!);

    expect(baseProps.onRestore).toHaveBeenCalledTimes(1);
    expect(baseProps.onRestore).toHaveBeenCalledWith("p-2");
  });

  it("does not let a non administrator restore", async () => {
    state.isAdmin = false;
    render(<ArchivedProjectsTable {...baseProps} />);

    const [restore] = screen.getAllByRole("button", { name: "Restore project" });
    expect(restore).toBeDisabled();
    expect(restore).toHaveAttribute("title", "Only administrators can restore projects");
    await userEvent.click(restore!);
    expect(baseProps.onRestore).not.toHaveBeenCalled();
    // Ver sigue disponible para todos.
    expect(screen.getAllByRole("link", { name: /^View / })).toHaveLength(2);
  });

  it("shows the empty message", () => {
    render(<ArchivedProjectsTable {...baseProps} items={[]} />);

    expect(screen.getByText("No archived projects")).toBeInTheDocument();
  });

  it("shows a custom empty message", () => {
    render(<ArchivedProjectsTable {...baseProps} items={[]} emptyMessage="Nothing here" />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("shows the loading state instead of the table", () => {
    render(<ArchivedProjectsTable {...baseProps} isLoading />);

    expect(screen.getByText("Loading archived projects…")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("offers a retry when the list fails to load", async () => {
    render(<ArchivedProjectsTable {...baseProps} isError />);

    expect(screen.getByText("Failed to load archived projects. Please try again.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));
    expect(baseProps.onError).toHaveBeenCalledTimes(1);
  });
});
