// ---------------------------------------------------------------------------
// Tests for the updateProject use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type { Project } from "@entities/projects/model";
import { updateProject } from "../update-project";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Project 1",
    status: "ACTIVE",
    users: [],
    facilities: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    createdBy: "user-1",
    ...overrides,
  };
}

function makeRepo(update = vi.fn()): ProjectsRepo {
  return {
    getProjects: vi.fn(),
    create: vi.fn(),
    update,
    deleteProject: vi.fn(),
    archive: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends only the id when nothing else changes", async () => {
    const project = makeProject();
    const repo = makeRepo(vi.fn().mockResolvedValue(project));

    await expect(updateProject(repo, { id: "project-1" })).resolves.toBe(
      project
    );
    expect(repo.update).toHaveBeenCalledWith({ id: "project-1" });
  });

  it("trims name, code and description", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));

    await updateProject(repo, {
      id: "project-1",
      name: "  New name  ",
      code: "  P-2  ",
      description: "  New description  ",
    });

    expect(repo.update).toHaveBeenCalledWith({
      id: "project-1",
      name: "New name",
      code: "P-2",
      description: "New description",
    });
  });

  it("forwards users, facilities and status when provided", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));
    const users = [{ id: "user-1", name: "User 1" }];
    await updateProject(repo, {
      id: "project-1",
      users,
      status: "ARCHIVED",
    });

    expect(repo.update).toHaveBeenCalledWith({
      id: "project-1",
      users,
      status: "ARCHIVED",
    });
  });

  it("still sends empty collections because an empty array is truthy", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));

    await updateProject(repo, { id: "project-1", users: [] });

    // Un array vacío es truthy, así que sí se envía: documentamos el contrato real.
    expect(repo.update).toHaveBeenCalledWith({
      id: "project-1",
      users: [],
    });
  });

  // Un nombre en blanco dejaba el proyecto sin nombre: si el campo se manda,
  // tiene que traer contenido.
  it("rejects a name that is only whitespace", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));

    await expect(
      updateProject(repo, { id: "project-1", name: "   " })
    ).rejects.toThrow("Project name is required");
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("not found")));

    await expect(updateProject(repo, { id: "project-1" })).rejects.toThrow(
      "not found"
    );
  });
});
