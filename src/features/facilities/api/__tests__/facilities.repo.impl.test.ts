// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de Facilities.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import { FacilitiesRepoHttp, facilitiesRepoImpl } from "../facilities.repo.impl";
import {
  mapFacilitiesListFromDTO,
  mapFacilityFromDTO,
  mapCreateFacilityParamsToDTO,
  mapUpdateFacilityParamsToDTO,
  type FacilitiesResponseDTO,
  type FacilityDTO,
} from "@entities/facility/lib/mappers";

const facilityDTO: FacilityDTO = {
  facility_id: "f-1",
  name: "Main Building",
  address: "1 Main St",
  city: "Springfield",
  description: "Head office",
  photo_url: "https://cdn.example.com/f-1.jpg",
  geo: { lat: 1.5, lng: -2.5 },
  status: "ACTIVE",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  created_by: "u-1",
  project_id: "p-1",
  user_ids: ["u-1", "u-2"],
};

const listDTO: FacilitiesResponseDTO = {
  facilities: [facilityDTO],
  total: 1,
  limit: 20,
  cursor: "cursor-1",
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getFacilities
// ---------------------------------------------------------------------------

describe("FacilitiesRepoHttp.getFacilities", () => {
  it("forwards every filter as a query param", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await new FacilitiesRepoHttp().getFacilities({
      limit: 20,
      status: "ACTIVE",
      search: "main",
      cursor: "cursor-1",
      projectId: "p-1",
    });

    expect(http.get).toHaveBeenCalledWith("/api/facilities", {
      params: {
        limit: 20,
        status: "ACTIVE",
        search: "main",
        cursor: "cursor-1",
        projectId: "p-1",
      },
    });
  });

  it.each([
    ["no filters", undefined],
    ["an empty filter object", {}],
  ])("leaves every param undefined with %s", async (_label, filters) => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await new FacilitiesRepoHttp().getFacilities(filters);

    expect(http.get).toHaveBeenCalledWith("/api/facilities", {
      params: {
        limit: undefined,
        status: undefined,
        search: undefined,
        cursor: undefined,
        projectId: undefined,
      },
    });
  });

  it("maps the response into a domain page", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    const page = await new FacilitiesRepoHttp().getFacilities();

    expect(page).toEqual(mapFacilitiesListFromDTO(listDTO));
    expect(page.items[0]?.id).toBe("f-1");
    expect(page.limit).toBe(20);
    expect(page.cursor).toBe("cursor-1");
  });
});

// ---------------------------------------------------------------------------
// Lecturas y mutaciones que desenvuelven la respuesta
// ---------------------------------------------------------------------------

/** Las tres formas en que el upstream puede envolver la facility. */
const wrappings: Array<[string, unknown]> = [
  ["a flat DTO", facilityDTO],
  ["a DTO wrapped in facility", { facility: facilityDTO }],
  ["a DTO wrapped in data", { data: facilityDTO }],
];

describe("FacilitiesRepoHttp.getById", () => {
  it("GETs the facility detail", async () => {
    http.get.mockResolvedValueOnce({ data: facilityDTO });

    await new FacilitiesRepoHttp().getById("f-1");

    expect(http.get).toHaveBeenCalledWith("/api/facilities/f-1");
  });

  it.each(wrappings)("unwraps %s", async (_label, payload) => {
    http.get.mockResolvedValueOnce({ data: payload });

    const facility = await new FacilitiesRepoHttp().getById("f-1");

    expect(facility).toEqual(mapFacilityFromDTO(facilityDTO));
    expect(facility.name).toBe("Main Building");
  });
});

describe("FacilitiesRepoHttp.create", () => {
  it("POSTs the payload produced by the mapper", async () => {
    http.post.mockResolvedValueOnce({ data: facilityDTO });
    const params = {
      name: "New Site",
      projectId: "p-1",
      address: "2 Second St",
      city: "Shelbyville",
      notes: "used as description",
      photoUrl: "https://cdn.example.com/new.jpg",
      geo: { lat: 10, lng: 20 },
    };

    await new FacilitiesRepoHttp().create(params);

    expect(http.post).toHaveBeenCalledWith(
      "/api/facilities",
      mapCreateFacilityParamsToDTO(params)
    );
    expect(http.post).toHaveBeenCalledWith("/api/facilities", {
      name: "New Site",
      status: "ACTIVE",
      project_id: "p-1",
      address: "2 Second St",
      city: "Shelbyville",
      notes: "used as description",
      photo_url: "https://cdn.example.com/new.jpg",
      geo: { lat: 10, lng: 20 },
    });
  });

  it("omits the optional fields that are absent", async () => {
    http.post.mockResolvedValueOnce({ data: facilityDTO });

    await new FacilitiesRepoHttp().create({ name: "Bare" });

    expect(http.post).toHaveBeenCalledWith("/api/facilities", {
      name: "Bare",
      status: "ACTIVE",
    });
  });

  it.each(wrappings)("unwraps %s from the create response", async (_label, payload) => {
    http.post.mockResolvedValueOnce({ data: payload });

    const created = await new FacilitiesRepoHttp().create({ name: "x" });

    expect(created).toEqual(mapFacilityFromDTO(facilityDTO));
  });
});

describe("FacilitiesRepoHttp.update", () => {
  it("PUTs to the facility URL with the mapped body", async () => {
    http.put.mockResolvedValueOnce({ data: facilityDTO });
    const params = {
      id: "f-1",
      name: "Renamed",
      city: "Ogdenville",
      clearPhoto: true,
      status: "ARCHIVED" as const,
    };

    await new FacilitiesRepoHttp().update(params);

    expect(http.put).toHaveBeenCalledWith(
      "/api/facilities/f-1",
      mapUpdateFacilityParamsToDTO(params)
    );
    expect(http.put).toHaveBeenCalledWith("/api/facilities/f-1", {
      name: "Renamed",
      city: "Ogdenville",
      photo_url: null,
      status: "ARCHIVED",
    });
  });

  it("sends an empty body when only the id is provided", async () => {
    http.put.mockResolvedValueOnce({ data: facilityDTO });

    await new FacilitiesRepoHttp().update({ id: "f-1" });

    expect(http.put).toHaveBeenCalledWith("/api/facilities/f-1", {});
  });

  it.each(wrappings)("unwraps %s from the update response", async (_label, payload) => {
    http.put.mockResolvedValueOnce({ data: payload });

    const updated = await new FacilitiesRepoHttp().update({ id: "f-1" });

    expect(updated).toEqual(mapFacilityFromDTO(facilityDTO));
  });
});

describe("FacilitiesRepoHttp.delete / archive / restore", () => {
  it("DELETEs the facility", async () => {
    http.delete.mockResolvedValueOnce({ data: undefined });

    await expect(
      new FacilitiesRepoHttp().delete("f-1")
    ).resolves.toBeUndefined();

    expect(http.delete).toHaveBeenCalledWith("/api/facilities/f-1");
  });

  it.each([
    ["archive", "archive"],
    ["restore", "restore"],
  ] as const)("POSTs to the %s sub-resource", async (method, segment) => {
    http.post.mockResolvedValueOnce({ data: facilityDTO });

    const repo = new FacilitiesRepoHttp();
    const result = await repo[method]("f-1");

    expect(http.post).toHaveBeenCalledWith(`/api/facilities/f-1/${segment}`);
    expect(result).toEqual(mapFacilityFromDTO(facilityDTO));
  });

  it.each(wrappings)("archive unwraps %s", async (_label, payload) => {
    http.post.mockResolvedValueOnce({ data: payload });

    const result = await new FacilitiesRepoHttp().archive("f-1");

    expect(result).toEqual(mapFacilityFromDTO(facilityDTO));
  });

  it.each(wrappings)("restore unwraps %s", async (_label, payload) => {
    http.post.mockResolvedValueOnce({ data: payload });

    const result = await new FacilitiesRepoHttp().restore("f-1");

    expect(result).toEqual(mapFacilityFromDTO(facilityDTO));
  });
});

// ---------------------------------------------------------------------------
// getUploadSignedUrl
// ---------------------------------------------------------------------------

describe("FacilitiesRepoHttp.getUploadSignedUrl", () => {
  const signature = {
    upload_url: "https://s3.example.com/bucket/f-1.jpg?X-Amz-Signature=abc",
    key: "facilities/f-1.jpg",
    expires_in: 900,
  };

  it("POSTs filename and content_type in snake_case", async () => {
    http.post.mockResolvedValueOnce({ data: signature });

    await new FacilitiesRepoHttp().getUploadSignedUrl("photo.jpg", "image/jpeg");

    expect(http.post).toHaveBeenCalledWith("/api/facilities/upload-img", {
      filename: "photo.jpg",
      content_type: "image/jpeg",
    });
  });

  it("strips the query string to build the public URL", async () => {
    http.post.mockResolvedValueOnce({ data: signature });

    const result = await new FacilitiesRepoHttp().getUploadSignedUrl(
      "photo.jpg",
      "image/jpeg"
    );

    expect(result).toEqual({
      uploadUrl: signature.upload_url,
      key: "facilities/f-1.jpg",
      expiresIn: 900,
      publicUrl: "https://s3.example.com/bucket/f-1.jpg",
    });
  });

  it("keeps the URL as-is when there is no query string", async () => {
    const noQuery = { ...signature, upload_url: "https://s3.example.com/f-1.jpg" };
    http.post.mockResolvedValueOnce({ data: noQuery });

    const result = await new FacilitiesRepoHttp().getUploadSignedUrl("p", "t");

    expect(result.publicUrl).toBe("https://s3.example.com/f-1.jpg");
  });

  it("unwraps a response nested under data", async () => {
    http.post.mockResolvedValueOnce({ data: { data: signature } });

    const result = await new FacilitiesRepoHttp().getUploadSignedUrl("p", "t");

    expect(result.key).toBe("facilities/f-1.jpg");
  });
});

// ---------------------------------------------------------------------------
// uploadFile (fetch contra el proxy interno)
// ---------------------------------------------------------------------------

describe("FacilitiesRepoHttp.uploadFile", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs the file to the proxy with the base64 encoded target", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    const uploadUrl = "https://s3.example.com/bucket/f-1.jpg?sig=abc";
    const file = new File(["binary"], "f-1.jpg", { type: "image/jpeg" });

    await new FacilitiesRepoHttp().uploadFile(uploadUrl, file);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/uploads/proxy?url=${btoa(uploadUrl)}`,
      {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/jpeg" },
      }
    );
  });

  it("falls back to application/octet-stream for a typeless file", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    const file = new File(["binary"], "f-1.bin");

    await new FacilitiesRepoHttp().uploadFile("https://s3.example.com/x", file);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/octet-stream"
    );
  });

  it("throws UPLOAD_FAILED when the proxy answers with an error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("AccessDenied", { status: 403 })
    );
    const file = new File(["binary"], "f-1.jpg", { type: "image/jpeg" });

    await expect(
      new FacilitiesRepoHttp().uploadFile("https://s3.example.com/x", file)
    ).rejects.toEqual({
      code: "UPLOAD_FAILED",
      message: "Failed to upload facility photo",
      details: { status: 403, body: "AccessDenied" },
    });
  });

  it("wraps a network failure into UNEXPECTED_ERROR", async () => {
    const raw = new Error("offline");
    fetchMock.mockRejectedValueOnce(raw);
    const file = new File(["binary"], "f-1.jpg", { type: "image/jpeg" });

    await expect(
      new FacilitiesRepoHttp().uploadFile("https://s3.example.com/x", file)
    ).rejects.toEqual({
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error",
      details: raw,
    });
  });
});

// ---------------------------------------------------------------------------
// Normalización de errores
// ---------------------------------------------------------------------------

describe("FacilitiesRepoHttp error normalisation", () => {
  const apiError = { code: "FORBIDDEN", message: "nope", details: { a: 1 } };
  const repo = () => new FacilitiesRepoHttp();

  const cases: Array<[string, "get" | "post" | "put" | "delete", () => Promise<unknown>]> = [
    ["getFacilities", "get", () => repo().getFacilities()],
    ["getById", "get", () => repo().getById("f-1")],
    ["create", "post", () => repo().create({ name: "x" })],
    ["update", "put", () => repo().update({ id: "f-1" })],
    ["delete", "delete", () => repo().delete("f-1")],
    ["archive", "post", () => repo().archive("f-1")],
    ["restore", "post", () => repo().restore("f-1")],
    ["getUploadSignedUrl", "post", () => repo().getUploadSignedUrl("a", "b")],
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

describe("facilitiesRepoImpl singleton", () => {
  it("uses the default base path", async () => {
    http.get.mockResolvedValueOnce({ data: listDTO });

    await facilitiesRepoImpl.getFacilities();

    expect(http.get).toHaveBeenCalledWith("/api/facilities", expect.anything());
  });

  it("honours a custom base path", async () => {
    http.get.mockResolvedValueOnce({ data: facilityDTO });

    await new FacilitiesRepoHttp("/api/v2/facilities").getById("f-1");

    expect(http.get).toHaveBeenCalledWith("/api/v2/facilities/f-1");
  });
});
