// ---------------------------------------------------------------------------
// Tests for the project mappers (DTO -> domain)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapProjectFromDTO,
  mapProjectsListFromDTO,
  type ProjectDTO,
  type ProjectsResponseDTO,
} from "../mappers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ProjectDTO minimo con los campos obligatorios. */
function makeProjectDTO(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    project_id: "p-1",
    name: "Project One",
    status: "ACTIVE",
    users: [],
    facilities: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    created_by: "user-1",
    ...overrides,
  };
}

/** Respuesta de listado envuelta en `data`. */
function makeResponseDTO(
  data: Partial<ProjectsResponseDTO["data"]> = {}
): ProjectsResponseDTO {
  return {
    data: { projects: [], ...data },
    status: "ok",
  };
}

// ---------------------------------------------------------------------------
// mapProjectFromDTO
// ---------------------------------------------------------------------------

describe("mapProjectFromDTO", () => {
  it("maps every snake_case field to camelCase", () => {
    const dto = makeProjectDTO({
      project_id: "p-42",
      code: "PRJ-42",
      name: "Project 42",
      description: "The answer",
      status: "ARCHIVED",
      users: [{ id: "u-1", name: "Jane" }],
      facilities: [{ facility_id: "fa-1", project_id: "p-42", name: "Site A" }],
    });

    expect(mapProjectFromDTO(dto)).toEqual({
      id: "p-42",
      code: "PRJ-42",
      name: "Project 42",
      description: "The answer",
      status: "ARCHIVED",
      users: [{ id: "u-1", name: "Jane" }],
      facilities: [{ id: "fa-1", name: "Site A" }],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      createdBy: "user-1",
    });
  });

  it("defaults code and description to empty strings when absent", () => {
    const result = mapProjectFromDTO(makeProjectDTO());

    expect(result.code).toBe("");
    expect(result.description).toBe("");
  });

  it("returns empty arrays for empty users and facilities", () => {
    const result = mapProjectFromDTO(makeProjectDTO());

    expect(result.users).toEqual([]);
    expect(result.facilities).toEqual([]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
  ])("returns empty arrays when users and facilities are %s", (_label, value) => {
    const result = mapProjectFromDTO(
      makeProjectDTO({ users: value as never, facilities: value as never })
    );

    expect(result.users).toEqual([]);
    expect(result.facilities).toEqual([]);
  });

  it("keeps only id and name for each facility", () => {
    const result = mapProjectFromDTO(
      makeProjectDTO({
        facilities: [{ facility_id: "fa-1", project_id: "p-1", name: "Site A" }],
      })
    );

    expect(result.facilities[0]).toEqual({ id: "fa-1", name: "Site A" });
    expect(result.facilities[0]).not.toHaveProperty("projectId");
  });

  // Las fechas se validan: una inválida llegaba a la interfaz y se mostraba
  // como "Invalid Date".
  it("normalizes an invalid date to an empty string", () => {
    const result = mapProjectFromDTO(
      makeProjectDTO({ created_at: "not-a-date", updated_at: "  " })
    );

    expect(result.createdAt).toBe("");
    expect(result.updatedAt).toBe("");
  });

  it("keeps a valid date untouched", () => {
    const result = mapProjectFromDTO(
      makeProjectDTO({ created_at: "2026-01-15T10:30:00Z" })
    );

    expect(result.createdAt).toBe("2026-01-15T10:30:00Z");
  });
});

// ---------------------------------------------------------------------------
// mapProjectsListFromDTO
// ---------------------------------------------------------------------------

describe("mapProjectsListFromDTO", () => {
  it("maps every project of the page", () => {
    const page = mapProjectsListFromDTO(
      makeResponseDTO({
        projects: [
          makeProjectDTO({ project_id: "p-1" }),
          makeProjectDTO({ project_id: "p-2" }),
        ],
        limit: 20,
        cursor: "next",
      })
    );

    expect(page.items).toHaveLength(2);
    expect(page.items[1]?.id).toBe("p-2");
    expect(page.limit).toBe(20);
    expect(page.cursor).toBe("next");
  });

  it("returns an empty page for an empty project list", () => {
    expect(mapProjectsListFromDTO(makeResponseDTO())).toEqual({
      items: [],
      limit: 0,
      cursor: "",
    });
  });

  it("keeps a limit of 0 instead of treating it as absent", () => {
    expect(mapProjectsListFromDTO(makeResponseDTO({ limit: 0 })).limit).toBe(0);
  });

  // El backend puede mandar el limit como string: descartarlo lo dejaba en 0 y
  // rompía el cálculo de páginas.
  it("accepts a numeric limit sent as a string", () => {
    const page = mapProjectsListFromDTO(
      makeResponseDTO({ limit: "20" as never })
    );

    expect(page.limit).toBe(20);
  });

  it("falls back to limit 0 when the limit is not usable", () => {
    const page = mapProjectsListFromDTO(
      makeResponseDTO({ limit: "muchos" as never })
    );

    expect(page.limit).toBe(0);
  });

  it("falls back to an empty cursor when it is absent", () => {
    expect(mapProjectsListFromDTO(makeResponseDTO()).cursor).toBe("");
  });

  // Una respuesta malformada degrada a una página vacía en vez de romper.
  it.each([
    ["the data envelope is missing", { status: "ok" }],
    ["the response is null", null],
    ["projects is not an array", { data: { projects: "nope" } }],
  ])("returns an empty page when %s", (_label, response) => {
    const page = mapProjectsListFromDTO(response as never);

    expect(page.items).toEqual([]);
    expect(page.limit).toBe(0);
    expect(page.cursor).toBe("");
  });
});
