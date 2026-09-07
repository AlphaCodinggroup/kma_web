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

  it("does not validate or normalize the date fields", () => {
    const result = mapProjectFromDTO(
      makeProjectDTO({ created_at: "not-a-date", updated_at: "  " })
    );

    // FIXME: las fechas llegan sin validar; un valor invalido se propaga a la UI.
    expect(result.createdAt).toBe("not-a-date");
    expect(result.updatedAt).toBe("  ");
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

  it("falls back to limit 0 when the limit is not a number", () => {
    const page = mapProjectsListFromDTO(
      makeResponseDTO({ limit: "20" as never })
    );

    // FIXME: un limit numerico como string se descarta y queda en 0, lo que
    // rompe el calculo de paginas en la UI.
    expect(page.limit).toBe(0);
  });

  it("falls back to an empty cursor when it is absent", () => {
    expect(mapProjectsListFromDTO(makeResponseDTO()).cursor).toBe("");
  });

  it("throws when the data envelope is missing", () => {
    // FIXME: no hay guarda defensiva sobre `response.data`.
    expect(() => mapProjectsListFromDTO({ status: "ok" } as never)).toThrow();
  });
});
