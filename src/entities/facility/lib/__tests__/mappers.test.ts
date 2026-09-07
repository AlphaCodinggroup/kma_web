// ---------------------------------------------------------------------------
// Tests for the facility mappers (both directions)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapCreateFacilityParamsToDTO,
  mapUpdateFacilityParamsToDTO,
  mapFacilityFromDTO,
  mapFacilitiesListFromDTO,
  type FacilityDTO,
} from "../mappers";
import type {
  CreateFacilityParams,
  UpdateFacilityParams,
} from "@entities/facility/model";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** FacilityDTO minimo con todos los campos obligatorios. */
function makeFacilityDTO(overrides: Partial<FacilityDTO> = {}): FacilityDTO {
  return {
    facility_id: "fa-1",
    name: "Facility One",
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    created_by: "user-1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapCreateFacilityParamsToDTO
// ---------------------------------------------------------------------------

describe("mapCreateFacilityParamsToDTO", () => {
  it("maps every domain field to its snake_case counterpart", () => {
    const params: CreateFacilityParams = {
      name: "Facility One",
      projectId: "p-1",
      address: "1 Main St",
      city: "Springfield",
      description: "A description",
      photoUrl: "https://cdn/photo.jpg",
      status: "ARCHIVED",
      geo: { lat: 1.5, lng: -2.5 },
    };

    expect(mapCreateFacilityParamsToDTO(params)).toEqual({
      name: "Facility One",
      project_id: "p-1",
      address: "1 Main St",
      city: "Springfield",
      description: "A description",
      photo_url: "https://cdn/photo.jpg",
      status: "ARCHIVED",
      geo: { lat: 1.5, lng: -2.5 },
    });
  });

  it("defaults the status to ACTIVE and omits every absent field", () => {
    expect(mapCreateFacilityParamsToDTO({ name: "Only name" })).toEqual({
      name: "Only name",
      status: "ACTIVE",
    });
  });

  // notes es un campo propio de punta a punta: antes se escribía sobre
  // description porque el backend no lo tenía.
  it("sends notes in its own field", () => {
    const dto = mapCreateFacilityParamsToDTO({
      name: "F",
      notes: "some notes",
    });

    expect(dto.notes).toBe("some notes");
    expect(dto).not.toHaveProperty("description");
  });

  it("sends description and notes together", () => {
    const dto = mapCreateFacilityParamsToDTO({
      name: "F",
      description: "the description",
      notes: "the notes",
    });

    expect(dto.description).toBe("the description");
    expect(dto.notes).toBe("the notes");
  });

  it.each([
    ["address", "address"],
    ["city", "city"],
    ["description", "description"],
    // photoUrl queda fuera a propósito: para borrar la foto el dominio tiene
    // el flag `clearPhoto`, no una cadena vacía.
  ] as const)("sends an explicitly empty %s", (domainKey, dtoKey) => {
    const params = { name: "F", [domainKey]: "" } as CreateFacilityParams;

    // El vacío se envía: descartarlo hacía imposible dejar el campo en blanco.
    expect(mapCreateFacilityParamsToDTO(params)).toHaveProperty(dtoKey, "");
  });

  it("keeps a geo point at the 0,0 coordinates", () => {
    const dto = mapCreateFacilityParamsToDTO({
      name: "F",
      geo: { lat: 0, lng: 0 },
    });

    expect(dto.geo).toEqual({ lat: 0, lng: 0 });
  });
});

// ---------------------------------------------------------------------------
// mapUpdateFacilityParamsToDTO
// ---------------------------------------------------------------------------

describe("mapUpdateFacilityParamsToDTO", () => {
  it("returns an empty payload when only the id is present", () => {
    expect(mapUpdateFacilityParamsToDTO({ id: "fa-1" })).toEqual({});
  });

  it("never sends the id in the body", () => {
    const dto = mapUpdateFacilityParamsToDTO({ id: "fa-1", name: "New name" });

    expect(dto).not.toHaveProperty("id");
    expect(dto).not.toHaveProperty("facility_id");
  });

  it("maps every provided field", () => {
    const params: UpdateFacilityParams = {
      id: "fa-1",
      name: "New name",
      address: "2 Main St",
      city: "Shelbyville",
      description: "New description",
      photoUrl: "https://cdn/new.jpg",
      status: "ARCHIVED",
      geo: { lat: 10, lng: 20 },
    };

    expect(mapUpdateFacilityParamsToDTO(params)).toEqual({
      name: "New name",
      address: "2 Main St",
      city: "Shelbyville",
      description: "New description",
      photo_url: "https://cdn/new.jpg",
      status: "ARCHIVED",
      geo: { lat: 10, lng: 20 },
    });
  });

  it("keeps empty strings because the update mapper uses != null", () => {
    // A diferencia del mapper de creacion, este conserva los strings vacios.
    const dto = mapUpdateFacilityParamsToDTO({
      id: "fa-1",
      name: "",
      address: "",
      city: "",
    });

    expect(dto).toEqual({ name: "", address: "", city: "" });
  });

  // Actualizar sólo notes ya no sobrescribe description.
  it("updates notes without touching description", () => {
    const dto = mapUpdateFacilityParamsToDTO({ id: "fa-1", notes: "just notes" });

    expect(dto.notes).toBe("just notes");
    expect(dto).not.toHaveProperty("description");
  });

  it("clears the photo when clearPhoto is true", () => {
    const dto = mapUpdateFacilityParamsToDTO({
      id: "fa-1",
      clearPhoto: true,
      photoUrl: "https://cdn/ignored.jpg",
    });

    expect(dto.photo_url).toBeNull();
  });

  it("keeps the photo url when clearPhoto is false", () => {
    const dto = mapUpdateFacilityParamsToDTO({
      id: "fa-1",
      clearPhoto: false,
      photoUrl: "https://cdn/kept.jpg",
    });

    expect(dto.photo_url).toBe("https://cdn/kept.jpg");
  });

  it("keeps a geo point at the 0,0 coordinates", () => {
    const dto = mapUpdateFacilityParamsToDTO({
      id: "fa-1",
      geo: { lat: 0, lng: 0 },
    });

    expect(dto.geo).toEqual({ lat: 0, lng: 0 });
  });
});

// ---------------------------------------------------------------------------
// mapFacilityFromDTO
// ---------------------------------------------------------------------------

describe("mapFacilityFromDTO", () => {
  it("maps a complete DTO", () => {
    const dto = makeFacilityDTO({
      address: "1 Main St",
      city: "Springfield",
      description: "A description",
      notes: "Some notes",
      photo_url: "https://cdn/photo.jpg",
      geo: { lat: 1, lng: 2 },
      project_id: "p-1",
      user_ids: ["u-1", "u-2"],
      updated_by: "user-2",
      archived_at: "2026-02-02T00:00:00Z",
      archived_by: "user-3",
    });

    expect(mapFacilityFromDTO(dto)).toEqual({
      id: "fa-1",
      projectId: "p-1",
      name: "Facility One",
      status: "ACTIVE",
      userIds: ["u-1", "u-2"],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      createdBy: "user-1",
      address: "1 Main St",
      city: "Springfield",
      description: "A description",
      notes: "Some notes",
      geo: { lat: 1, lng: 2 },
      photoUrl: "https://cdn/photo.jpg",
      updatedBy: "user-2",
      archivedAt: "2026-02-02T00:00:00Z",
      archivedBy: "user-3",
    });
  });

  it("omits every optional field that is absent", () => {
    const result = mapFacilityFromDTO(makeFacilityDTO());

    expect(result).toEqual({
      id: "fa-1",
      projectId: "",
      name: "Facility One",
      status: "ACTIVE",
      userIds: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      createdBy: "user-1",
    });
  });

  it("omits every optional field that is explicitly null", () => {
    const result = mapFacilityFromDTO(
      makeFacilityDTO({
        address: null,
        city: null,
        description: null,
        notes: null,
        photo_url: null,
        geo: null,
        project_id: null,
        updated_by: null,
      })
    );

    expect(result).not.toHaveProperty("address");
    expect(result).not.toHaveProperty("city");
    expect(result).not.toHaveProperty("description");
    expect(result).not.toHaveProperty("notes");
    expect(result).not.toHaveProperty("photoUrl");
    expect(result).not.toHaveProperty("geo");
    expect(result).not.toHaveProperty("updatedBy");
    expect(result.projectId).toBe("");
  });

  // Al leer, notes queda ausente si el backend no la trae: antes copiaba
  // description y la interfaz no podía saber si había notas de verdad.
  it("leaves notes absent when the DTO has none", () => {
    const result = mapFacilityFromDTO(
      makeFacilityDTO({ description: "A description" })
    );

    expect(result.description).toBe("A description");
    expect(result.notes).toBeUndefined();
  });

  it("reads notes from its own field", () => {
    const result = mapFacilityFromDTO(
      makeFacilityDTO({ description: "A description", notes: "Some notes" })
    );

    expect(result.description).toBe("A description");
    expect(result.notes).toBe("Some notes");
  });

  it("keeps archived_at and archived_by null when they are explicitly null", () => {
    const result = mapFacilityFromDTO(
      makeFacilityDTO({ archived_at: null, archived_by: null })
    );

    expect(result.archivedAt).toBeNull();
    expect(result.archivedBy).toBeNull();
  });

  it("keeps an empty user_ids array", () => {
    expect(mapFacilityFromDTO(makeFacilityDTO({ user_ids: [] })).userIds).toEqual(
      []
    );
  });

  it("keeps empty strings for the optional text fields", () => {
    const result = mapFacilityFromDTO(
      makeFacilityDTO({ address: "", city: "", photo_url: "" })
    );

    expect(result.address).toBe("");
    expect(result.city).toBe("");
    expect(result.photoUrl).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapFacilitiesListFromDTO
// ---------------------------------------------------------------------------

describe("mapFacilitiesListFromDTO", () => {
  it("maps every item of the page", () => {
    const page = mapFacilitiesListFromDTO({
      facilities: [
        makeFacilityDTO({ facility_id: "fa-1" }),
        makeFacilityDTO({ facility_id: "fa-2" }),
      ],
      limit: 10,
      cursor: "next-cursor",
    });

    expect(page.items).toHaveLength(2);
    expect(page.items[1]?.id).toBe("fa-2");
    expect(page.limit).toBe(10);
    expect(page.cursor).toBe("next-cursor");
  });

  it("returns an empty page for an empty facility list", () => {
    expect(mapFacilitiesListFromDTO({ facilities: [] })).toEqual({ items: [] });
  });

  it("keeps a limit of 0 instead of treating it as absent", () => {
    expect(mapFacilitiesListFromDTO({ facilities: [], limit: 0 }).limit).toBe(0);
  });

  it("omits limit and cursor when they are null", () => {
    const page = mapFacilitiesListFromDTO({
      facilities: [],
      limit: null,
      cursor: null,
    });

    expect(page).not.toHaveProperty("limit");
    expect(page).not.toHaveProperty("cursor");
  });

  it("keeps an empty cursor string", () => {
    expect(mapFacilitiesListFromDTO({ facilities: [], cursor: "" }).cursor).toBe(
      ""
    );
  });

  // El total del backend se modela: antes se descartaba y la paginación de la
  // interfaz no tenía con qué calcular.
  it("keeps the total returned by the API", () => {
    const page = mapFacilitiesListFromDTO({ facilities: [], total: 57 });

    expect(page.total).toBe(57);
  });

  // Una respuesta malformada degrada a una página vacía en vez de romper.
  it.each([
    ["the facilities key is missing", {}],
    ["the response is null", null],
    ["facilities is not an array", { facilities: "nope" }],
  ])("returns an empty page when %s", (_label, response) => {
    const page = mapFacilitiesListFromDTO(response as never);

    expect(page.items).toEqual([]);
  });
});
