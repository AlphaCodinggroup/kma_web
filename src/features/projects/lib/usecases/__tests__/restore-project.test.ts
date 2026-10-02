// ---------------------------------------------------------------------------
// Tests for the restoreProjectUseCase use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Project } from "@entities/projects/model";

// El caso de uso importa la implementación HTTP directamente (sin DI), así que
// se reemplaza el módulo completo antes de importarlo.
const restoreMock = vi.fn();

vi.mock("@features/projects/api/projects.repo.impl", () => ({
  projectsRepoImpl: {
    getProjects: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteProject: vi.fn(),
    restore: (...args: unknown[]) => restoreMock(...args),
  },
}));

import { restoreProjectUseCase } from "../restore-project";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("restoreProjectUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty id", ""],
    ["a whitespace-only id", "   "],
  ])("throws on %s", async (_label, id) => {
    await expect(restoreProjectUseCase({ id })).rejects.toThrow(
      "Project id is required to restore a project"
    );
    expect(restoreMock).not.toHaveBeenCalled();
  });

  it("trims the id before calling the repository", async () => {
    const project = makeProject();
    restoreMock.mockResolvedValue(project);

    await expect(
      restoreProjectUseCase({ id: "  project-1  " })
    ).resolves.toBe(project);
    expect(restoreMock).toHaveBeenCalledWith("project-1");
  });

  it("propagates the repository error", async () => {
    restoreMock.mockRejectedValue(new Error("not archived"));

    await expect(restoreProjectUseCase({ id: "project-1" })).rejects.toThrow(
      "not archived"
    );
  });
});
