// ---------------------------------------------------------------------------
// Tests for the deleteProject use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";

const defaultDeleteProject = vi.fn();

vi.mock("@features/projects/api/projects.repo.impl", () => ({
  projectsRepoImpl: {
    getProjects: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteProject: (...args: unknown[]) => defaultDeleteProject(...args),
    archive: vi.fn(),
  },
}));

import { deleteProject } from "../deleteProject";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRepo(remove = vi.fn()): ProjectsRepo {
  return {
    getProjects: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteProject: remove,
    archive: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deleteProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the injected repository with the project id", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(undefined));

    await expect(
      deleteProject("project-1", { projectsRepo: repo })
    ).resolves.toBeUndefined();
    expect(repo.deleteProject).toHaveBeenCalledWith("project-1");
  });

  // Sin la guarda, un id vacío le pegaba a DELETE /api/projects/ (la colección).
  it("rejects an empty id without reaching the repository", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(undefined));

    await expect(deleteProject("", { projectsRepo: repo })).rejects.toThrow(
      "deleteProject: id is required"
    );
    expect(repo.deleteProject).not.toHaveBeenCalled();
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("conflict")));

    await expect(
      deleteProject("project-1", { projectsRepo: repo })
    ).rejects.toThrow("conflict");
  });

  it("falls back to the default repository when no deps are given", async () => {
    defaultDeleteProject.mockResolvedValue(undefined);

    await deleteProject("project-default");

    expect(defaultDeleteProject).toHaveBeenCalledWith("project-default");
  });
});
