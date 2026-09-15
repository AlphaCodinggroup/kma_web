// ---------------------------------------------------------------------------
// Tests for the archiveProjectUseCase use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Project } from "@entities/projects/model";

// El caso de uso importa la implementación HTTP directamente (sin DI), así que
// se reemplaza el módulo completo antes de importarlo.
const archiveMock = vi.fn();

vi.mock("@features/projects/api/projects.repo.impl", () => ({
  projectsRepoImpl: {
    getProjects: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteProject: vi.fn(),
    archive: (...args: unknown[]) => archiveMock(...args),
  },
}));

import { archiveProjectUseCase } from "../archive-project";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Project 1",
    status: "ARCHIVED",
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

describe("archiveProjectUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty id", ""],
    ["a whitespace-only id", "   "],
  ])("throws on %s", async (_label, id) => {
    await expect(archiveProjectUseCase({ id })).rejects.toThrow(
      "Project id is required to archive a project"
    );
    expect(archiveMock).not.toHaveBeenCalled();
  });

  it("trims the id before calling the repository", async () => {
    const project = makeProject();
    archiveMock.mockResolvedValue(project);

    await expect(
      archiveProjectUseCase({ id: "  project-1  " })
    ).resolves.toBe(project);
    expect(archiveMock).toHaveBeenCalledWith("project-1");
  });

  it("propagates the repository error", async () => {
    archiveMock.mockRejectedValue(new Error("already archived"));

    await expect(archiveProjectUseCase({ id: "project-1" })).rejects.toThrow(
      "already archived"
    );
  });
});
