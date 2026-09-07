// ---------------------------------------------------------------------------
// Tests for the fetchProjects use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  Project,
  ProjectListFilter,
  ProjectListPage,
} from "@entities/projects/model";
import { fetchProjects } from "../fetch-projects";

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

function makePage(overrides: Partial<ProjectListPage> = {}): ProjectListPage {
  return { items: [makeProject()], limit: 20, ...overrides };
}

/** Repositorio doble con todos los métodos del puerto de dominio. */
function makeRepo(getProjects = vi.fn()): ProjectsRepo {
  return {
    getProjects,
    create: vi.fn(),
    update: vi.fn(),
    deleteProject: vi.fn(),
    archive: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<[string, ProjectListFilter | undefined]>([
    ["no filters", undefined],
    ["a status filter", { status: "ARCHIVED" }],
    ["a search term", { search: "hospital" }],
    ["pagination", { limit: 10, cursor: "cursor-1" }],
    ["sorting", { sortBy: "name", sortOrder: "asc" }],
  ])("forwards %s to the repository", async (_label, filters) => {
    const page = makePage();
    const repo = makeRepo(vi.fn().mockResolvedValue(page));

    await expect(fetchProjects(repo, filters)).resolves.toBe(page);
    expect(repo.getProjects).toHaveBeenCalledWith(filters);
  });

  it("returns an empty page untouched", async () => {
    const page = makePage({ items: [] });
    const repo = makeRepo(vi.fn().mockResolvedValue(page));

    await expect(fetchProjects(repo)).resolves.toEqual({ items: [], limit: 20 });
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("unauthorized")));

    await expect(fetchProjects(repo)).rejects.toThrow("unauthorized");
  });
});
