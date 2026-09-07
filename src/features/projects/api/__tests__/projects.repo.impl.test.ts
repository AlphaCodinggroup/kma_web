// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de Projects.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

const { http } = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@shared/api/http.client", () => ({ httpClient: http, default: http }));

import { ProjectsRepoHttp, projectsRepoImpl } from "../projects.repo.impl";
import {
  mapProjectsListFromDTO,
  mapProjectFromDTO,
  type ProjectDTO,
  type ProjectsResponseDTO,
} from "@entities/projects/lib/mappers";

const projectDTO: ProjectDTO = {
  project_id: "p-1",
  code: "PRJ-1",
  name: "Project One",
  description: "First project",
  status: "ACTIVE",
  users: [{ id: "u-1", name: "Ada" }],
  facilities: [{ facility_id: "f-1", name: "Main Building" }],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  created_by: "u-1",
};

const listDTO: ProjectsResponseDTO = {
  data: { projects: [projectDTO], limit: 20, cursor: "cursor-1" },
  status: "ok",
};

/** Formas en que el upstream puede envolver el proyecto. */
const wrappings: Array<[string, unknown]> = [
  ["a flat DTO", projectDTO],
  ["a DTO wrapped in project", { project: projectDTO }],
  ["a DTO wrapped in data", { data: projectDTO }],
];

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getProjects
// ---------------------------------------------------------------------------

describe("ProjectsRepoHttp.getProjects", () => {
  it("forwards every filter as a query param", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await new ProjectsRepoHttp().getProjects({
      limit: 20,
      status: "ACTIVE",
      search: "one",
      cursor: "cursor-1",
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(http.get).toHaveBeenCalledWith("/api/projects", {
      params: {
        limit: 20,
        status: "ACTIVE",
        search: "one",
        cursor: "cursor-1",
        sortBy: "name",
        sortOrder: "asc",
      },
    });
  });

  it.each([
    ["no filters", undefined],
    ["an empty filter object", {}],
  ])("leaves every param undefined with %s", async (_label, params) => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await new ProjectsRepoHttp().getProjects(params);

    expect(http.get).toHaveBeenCalledWith("/api/projects", {
      params: {
        limit: undefined,
        status: undefined,
        search: undefined,
        cursor: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      },
    });
  });

  it("maps the nested response into a domain page", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    const page = await new ProjectsRepoHttp().getProjects();

    expect(page).toEqual(mapProjectsListFromDTO(listDTO));
    expect(page.items[0]?.id).toBe("p-1");
    expect(page.items[0]?.facilities).toEqual([
      { id: "f-1", name: "Main Building" },
    ]);
    expect(page.limit).toBe(20);
    expect(page.cursor).toBe("cursor-1");
  });
});

// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------

describe("ProjectsRepoHttp.getById", () => {
  it("GETs the project detail", async () => {
    http.get.mockResolvedValueOnce({ data: projectDTO });

    await new ProjectsRepoHttp().getById("p-1");

    expect(http.get).toHaveBeenCalledWith("/api/projects/p-1");
  });

  it.each(wrappings)("unwraps %s", async (_label, payload) => {
    http.get.mockResolvedValueOnce({ data: payload });

    const project = await new ProjectsRepoHttp().getById("p-1");

    expect(project).toEqual(mapProjectFromDTO(projectDTO));
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("ProjectsRepoHttp.create", () => {
  it("builds the full snake_case body", async () => {
    http.post.mockResolvedValueOnce({ data: projectDTO });

    await new ProjectsRepoHttp().create({
      name: "Project One",
      code: "PRJ-1",
      description: "First project",
      users: [{ id: "u-1", name: "Ada" }],
      facilities: [{ id: "f-1", name: "Main Building" }],
      status: "ACTIVE",
    });

    expect(http.post).toHaveBeenCalledWith(
      "/api/projects",
      {
        name: "Project One",
        code: "PRJ-1",
        description: "First project",
        users: [{ id: "u-1", name: "Ada" }],
        facilities: [{ facility_id: "f-1", name: "Main Building" }],
        status: "ACTIVE",
      },
      JSON_HEADERS
    );
  });

  // Tabla de omisiones: los campos vacíos no llegan al body.
  it.each([
    ["an empty code", { name: "N", code: "" }, { name: "N" }],
    ["an empty description", { name: "N", description: "" }, { name: "N" }],
    ["an empty users array", { name: "N", users: [] }, { name: "N" }],
    [
      "an empty facilities array",
      { name: "N", facilities: [] },
      { name: "N" },
    ],
    ["only the name", { name: "N" }, { name: "N" }],
  ])("omits %s", async (_label, params, expectedBody) => {
    http.post.mockResolvedValueOnce({ data: projectDTO });

    await new ProjectsRepoHttp().create(params);

    expect(http.post).toHaveBeenCalledWith(
      "/api/projects",
      expectedBody,
      JSON_HEADERS
    );
  });

  it.each(wrappings)("unwraps %s from the create response", async (_label, payload) => {
    http.post.mockResolvedValueOnce({ data: payload });

    const created = await new ProjectsRepoHttp().create({ name: "N" });

    expect(created).toEqual(mapProjectFromDTO(projectDTO));
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("ProjectsRepoHttp.update", () => {
  it("PATCHes the project URL with the full body", async () => {
    http.patch.mockResolvedValueOnce({ data: projectDTO });

    await new ProjectsRepoHttp().update({
      id: "p-1",
      name: "Renamed",
      code: "PRJ-2",
      description: "Updated",
      users: [{ id: "u-2", name: "Alan" }],
      facilities: [{ id: "f-2", name: "Annex" }],
      status: "ARCHIVED",
    });

    expect(http.patch).toHaveBeenCalledWith(
      "/api/projects/p-1",
      {
        name: "Renamed",
        code: "PRJ-2",
        description: "Updated",
        users: [{ id: "u-2", name: "Alan" }],
        facilities: [{ facility_id: "f-2", name: "Annex" }],
        status: "ARCHIVED",
      },
      JSON_HEADERS
    );
  });

  it("sends an empty body when only the id is provided", async () => {
    http.patch.mockResolvedValueOnce({ data: projectDTO });

    await new ProjectsRepoHttp().update({ id: "p-1" });

    expect(http.patch).toHaveBeenCalledWith(
      "/api/projects/p-1",
      {},
      JSON_HEADERS
    );
  });

  it.each(wrappings)("unwraps %s from the update response", async (_label, payload) => {
    http.patch.mockResolvedValueOnce({ data: payload });

    const updated = await new ProjectsRepoHttp().update({ id: "p-1" });

    expect(updated).toEqual(mapProjectFromDTO(projectDTO));
  });
});

// ---------------------------------------------------------------------------
// deleteProject / archive
// ---------------------------------------------------------------------------

describe("ProjectsRepoHttp.deleteProject / archive", () => {
  it("DELETEs the project", async () => {
    http.delete.mockResolvedValueOnce({ data: undefined });

    await expect(
      new ProjectsRepoHttp().deleteProject("p-1")
    ).resolves.toBeUndefined();

    expect(http.delete).toHaveBeenCalledWith("/api/projects/p-1");
  });

  it("POSTs to the archive sub-resource", async () => {
    http.post.mockResolvedValueOnce({ data: projectDTO });

    const result = await new ProjectsRepoHttp().archive("p-1");

    expect(http.post).toHaveBeenCalledWith("/api/projects/p-1/archive");
    expect(result).toEqual(mapProjectFromDTO(projectDTO));
  });

  it.each(wrappings)("archive unwraps %s", async (_label, payload) => {
    http.post.mockResolvedValueOnce({ data: payload });

    const result = await new ProjectsRepoHttp().archive("p-1");

    expect(result).toEqual(mapProjectFromDTO(projectDTO));
  });
});

// ---------------------------------------------------------------------------
// Normalización de errores
// ---------------------------------------------------------------------------

describe("ProjectsRepoHttp error normalisation", () => {
  const apiError = { code: "CONFLICT", message: "duplicated", details: null };
  const repo = () => new ProjectsRepoHttp();

  const cases: Array<
    [string, "get" | "post" | "patch" | "delete", () => Promise<unknown>]
  > = [
    ["getProjects", "get", () => repo().getProjects()],
    ["getById", "get", () => repo().getById("p-1")],
    ["create", "post", () => repo().create({ name: "N" })],
    ["update", "patch", () => repo().update({ id: "p-1" })],
    ["deleteProject", "delete", () => repo().deleteProject("p-1")],
    ["archive", "post", () => repo().archive("p-1")],
  ];

  it.each(cases)("%s propagates an ApiError untouched", async (_l, verb, run) => {
    http[verb].mockRejectedValueOnce(apiError);
    await expect(run()).rejects.toEqual(apiError);
  });

  it.each(cases)("%s wraps an unknown error", async (_l, verb, run) => {
    const raw = new Error("boom");
    http[verb].mockRejectedValueOnce(raw);

    await expect(run()).rejects.toEqual({
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error",
      details: raw,
    });
  });
});

describe("projectsRepoImpl singleton", () => {
  it("uses the default base path", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await projectsRepoImpl.getProjects();

    expect(http.get).toHaveBeenCalledWith("/api/projects", expect.anything());
  });

  it("honours a custom base path", async () => {
    http.delete.mockResolvedValueOnce({ data: undefined });

    await new ProjectsRepoHttp("/api/v2/projects").deleteProject("p-1");

    expect(http.delete).toHaveBeenCalledWith("/api/v2/projects/p-1");
  });
});
