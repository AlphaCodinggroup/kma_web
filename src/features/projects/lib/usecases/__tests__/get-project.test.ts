// ---------------------------------------------------------------------------
// Tests for the getProjectById use case
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from "vitest";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type { Project } from "@entities/projects/model";
import { getProjectById } from "../get-project";
import { projectDetailHref } from "../../project-href";

const project: Project = {
  id: "project-1",
  name: "Project 1",
  status: "ACTIVE",
  users: [],
  facilities: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  createdBy: "user-1",
};

function makeRepo(getById?: ProjectsRepo["getById"]): ProjectsRepo {
  return {
    getProjects: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteProject: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    ...(getById ? { getById } : {}),
  };
}

describe("getProjectById", () => {
  it("returns the project from the repository", async () => {
    const getById = vi.fn().mockResolvedValue(project);

    await expect(getProjectById(makeRepo(getById), "project-1")).resolves.toBe(
      project
    );
    expect(getById).toHaveBeenCalledWith("project-1");
  });

  it("propagates the repository error", async () => {
    const error = { code: "NOT_FOUND", message: "Not found" };
    const getById = vi.fn().mockRejectedValue(error);

    await expect(getProjectById(makeRepo(getById), "missing")).rejects.toBe(error);
  });

  it("fails clearly when the repository cannot fetch one project", async () => {
    await expect(getProjectById(makeRepo(), "project-1")).rejects.toThrow(
      "The projects repository cannot fetch a single project"
    );
  });
});

describe("projectDetailHref", () => {
  it("escapes the project id", () => {
    expect(projectDetailHref("a/b")).toBe("/projects/a%2Fb");
  });
});
