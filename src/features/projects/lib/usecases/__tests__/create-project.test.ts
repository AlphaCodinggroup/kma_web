// ---------------------------------------------------------------------------
// Tests for the createProject use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  CreateProjectParams,
  Project,
} from "@entities/projects/model";
import { createProject } from "../create-project";

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

function makeRepo(create = vi.fn()): ProjectsRepo {
  return {
    getProjects: vi.fn(),
    create,
    update: vi.fn(),
    deleteProject: vi.fn(),
    archive: vi.fn(),
  };
}

function makeParams(
  overrides: Partial<CreateProjectParams> = {}
): CreateProjectParams {
  return { name: "Project 1", ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["an empty name", ""],
    ["a whitespace-only name", "   "],
    ["a tab and newline name", "\t\n"],
  ])("throws on %s", async (_label, name) => {
    const repo = makeRepo();

    await expect(createProject(repo, makeParams({ name }))).rejects.toThrow(
      "Project name is required"
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("defaults the status to ACTIVE and normalizes the collections", async () => {
    const project = makeProject();
    const repo = makeRepo(vi.fn().mockResolvedValue(project));

    await expect(createProject(repo, makeParams())).resolves.toBe(project);
    expect(repo.create).toHaveBeenCalledWith({
      name: "Project 1",
      status: "ACTIVE",
      users: [],
      facilities: [],
    });
  });

  it("keeps an explicit status", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));

    await createProject(repo, makeParams({ status: "ARCHIVED" }));

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ARCHIVED" })
    );
  });

  it("trims name, code and description", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));

    await createProject(
      repo,
      makeParams({
        name: "  Project 1  ",
        code: "  P-1  ",
        description: "  A description  ",
      })
    );

    expect(repo.create).toHaveBeenCalledWith({
      name: "Project 1",
      status: "ACTIVE",
      code: "P-1",
      description: "A description",
      users: [],
      facilities: [],
    });
  });

  it("drops code and description when they are blank", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));

    await createProject(
      repo,
      makeParams({ code: "   ", description: "   " })
    );

    expect(repo.create).toHaveBeenCalledWith({
      name: "Project 1",
      status: "ACTIVE",
      users: [],
      facilities: [],
    });
  });

  it("forwards users and facilities when provided", async () => {
    const repo = makeRepo(vi.fn().mockResolvedValue(makeProject()));
    const users = [{ id: "user-1", name: "User 1" }];
    const facilities = [{ id: "facility-1", name: "Facility 1" }];

    await createProject(repo, makeParams({ users, facilities }));

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ users, facilities })
    );
  });

  it("propagates the repository error", async () => {
    const repo = makeRepo(vi.fn().mockRejectedValue(new Error("duplicated")));

    await expect(createProject(repo, makeParams())).rejects.toThrow(
      "duplicated"
    );
  });
});
