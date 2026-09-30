/**
 * Tabla de proyectos: el nombre lleva al detalle del proyecto.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "@entities/projects/model";

vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({ isAdmin: true }),
}));

import { ProjectsTable } from "../ProjectsTable";

const project: Project = {
  id: "project/1",
  name: "Boston Apartments",
  status: "ACTIVE",
  users: [],
  facilities: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  createdBy: "user-1",
};

describe("ProjectsTable", () => {
  it("links each project name to its detail page", () => {
    render(
      <ProjectsTable
        items={[project]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
        isLoading={false}
        isError={false}
        onError={vi.fn()}
        sortField={null}
        sortOrder={null}
        onSort={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: "Boston Apartments" })).toHaveAttribute(
      "href",
      "/projects/project%2F1"
    );
  });
});
