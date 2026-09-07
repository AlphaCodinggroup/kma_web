// ---------------------------------------------------------------------------
// Tests del repositorio de Audits (usa fetch contra las rutas internas /api).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AuditsApiError,
  auditRepoImpl,
} from "../audit.repo.impl";
import auditRepoDefault from "../audit.repo.impl";
import {
  mapAuditDetailDTOToDomain,
  type AuditDetailDTO,
} from "@entities/audit/lib/audit-detail.mappers";
import {
  mapAuditDtoToDomain,
  type AuditDTO,
} from "@entities/audit/lib/mappers";

const detailDTO: AuditDetailDTO = {
  id: "audit-1",
  flow_id: "flow-1",
  flow_name: "Ramps",
  flow_version: 2,
  project_id: "p-1",
  facility_id: "f-1",
  status: "draft_report_in_review",
  project_name: "Project One",
  auditor_name: "Ada",
  facility_name: "Facility One",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  report_items: [],
  comments: [],
};

const auditDTO: AuditDTO = {
  id: "audit-1",
  flow_id: "flow-1",
  flow_name: "Ramps",
  flow_version: 1,
  project_id: "p-1",
  facility_id: "f-1",
  status: "completed",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  project_name: "Project One",
  auditor_name: "Ada",
  facility_name: "Facility One",
  findings_count: 3,
};

/** Respuesta JSON real: ensureOk lee headers y hace res.json(). */
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "content-type": "application/json" },
  });
}

function textResponse(body: string, status: number, contentType = "text/plain") {
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------

describe("AuditRepoHttp.getById", () => {
  it.each([
    ["audit-1", "/api/audits/audit-1"],
    ["audit/1", "/api/audits/audit%2F1"],
    ["a b#c", "/api/audits/a%20b%23c"],
  ])("encodes the id %s into %s", async (id, expectedUrl) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(detailDTO));

    await auditRepoImpl.getById(id);

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  });

  it("maps the flat payload into the domain detail", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(detailDTO));

    const detail = await auditRepoImpl.getById("audit-1");

    expect(detail).toEqual(mapAuditDetailDTOToDomain(detailDTO));
    expect(detail.flowName).toBe("Ramps");
    expect(detail.version).toBe(2);
  });

  // El extractor acepta el DTO plano o envuelto en `audit` / `data`.
  it.each([
    ["wrapped in audit", { audit: detailDTO }],
    ["wrapped in data", { data: detailDTO }],
    ["flat with id + status", detailDTO],
  ])("extracts the detail DTO %s", async (_label, payload) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    const detail = await auditRepoImpl.getById("audit-1");

    expect(detail.id).toBe("audit-1");
  });

  it.each([
    ["an empty object", {}],
    ["a payload without status", { id: "audit-1" }],
    ["null", null],
    ["an array", []],
  ])("throws when the payload is %s", async (_label, payload) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    await expect(auditRepoImpl.getById("audit-1")).rejects.toThrow(
      "Invalid audit detail response"
    );
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe("AuditRepoHttp.list", () => {
  it.each([
    ["no params", undefined, "/api/audits"],
    ["an empty object", {}, "/api/audits"],
    [
      "only status",
      { status: "completed" },
      "/api/audits?status=completed",
    ],
    [
      "status and auditor",
      { status: "completed", auditor: "Ada Lovelace" },
      "/api/audits?status=completed&auditor=Ada+Lovelace",
    ],
    [
      "every filter",
      {
        status: "completed",
        auditor: "ada",
        limit: 25,
        last_eval_id: "cursor-1",
      },
      "/api/audits?status=completed&auditor=ada&limit=25&last_eval_id=cursor-1",
    ],
  ])("builds the URL with %s", async (_label, params, expectedUrl) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ audits: [auditDTO] }));

    await auditRepoImpl.list(params);

    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  });

  // limit 0 es un valor, no una ausencia: se envía en vez de descartarse por
  // falsy.
  it("forwards limit when it is zero", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ audits: [] }));

    await auditRepoImpl.list({ limit: 0 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audits?limit=0",
      expect.anything()
    );
  });

  // El extractor de la lista soporta varias formas de respuesta.
  it.each([
    ["a bare array", [auditDTO]],
    ["an object with audits", { audits: [auditDTO] }],
    ["an object with items", { items: [auditDTO] }],
    ["an object with data", { data: [auditDTO] }],
  ])("extracts the audits from %s", async (_label, payload) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    const result = await auditRepoImpl.list();

    expect(result.audits).toEqual([mapAuditDtoToDomain(auditDTO)]);
    expect(result.total).toBe(1);
  });

  it("returns an empty list for an unrecognised payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ unexpected: true }));

    const result = await auditRepoImpl.list();

    expect(result.audits).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.last_eval_id).toBeUndefined();
  });

  it("prefers the server total and forwards last_eval_id", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ audits: [auditDTO], total: 42, last_eval_id: "cursor-9" })
    );

    const result = await auditRepoImpl.list();

    expect(result.total).toBe(42);
    expect(result.last_eval_id).toBe("cursor-9");
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe("AuditRepoHttp.delete", () => {
  it("sends a DELETE request", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("", 204));

    await expect(auditRepoImpl.delete("audit-1")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith("/api/audits/audit-1", {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });
  });

  // El id se escapa igual que en getById: sin eso, un id con "/" alcanza otra
  // ruta del BFF.
  it("encodes the id", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("", 204));

    await auditRepoImpl.delete("audit/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audits/audit%2F1",
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// ensureOk — normalización de errores HTTP
// ---------------------------------------------------------------------------

describe("ensureOk error handling", () => {
  it("maps 401 to an Unauthorized AuditsApiError", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "ignored" }, 401));

    const err = (await auditRepoImpl
      .list()
      .catch((e: unknown) => e)) as AuditsApiError;

    expect(err).toBeInstanceOf(AuditsApiError);
    expect(err.name).toBe("AuditsApiError");
    expect(err.message).toBe("Unauthorized");
    expect(err.status).toBe(401);
  });

  it("uses the message from a JSON error body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "Audit is locked" }, 409)
    );

    const err = (await auditRepoImpl
      .list()
      .catch((e: unknown) => e)) as AuditsApiError;

    expect(err.message).toBe("Audit is locked");
    expect(err.status).toBe(409);
  });

  it.each([
    ["an empty JSON object", {}],
    ["a JSON body without message", { error: "nope" }],
    ["a JSON body with an empty message", { message: "" }],
  ])("falls back to 'Upstream error' with %s", async (_label, body) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(body, 500));

    await expect(auditRepoImpl.list()).rejects.toThrow("Upstream error");
  });

  it("falls back when the JSON body cannot be parsed", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<<not json>>", {
        status: 502,
        headers: { "content-type": "application/json" },
      })
    );

    const err = (await auditRepoImpl
      .list()
      .catch((e: unknown) => e)) as AuditsApiError;

    expect(err.message).toBe("Upstream error");
    expect(err.status).toBe(502);
  });

  it("uses the plain-text body for non JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("gateway timeout", 504));

    const err = (await auditRepoImpl
      .list()
      .catch((e: unknown) => e)) as AuditsApiError;

    expect(err.message).toBe("gateway timeout");
    expect(err.status).toBe(504);
  });

  it("falls back to 'Upstream error' for an empty non JSON body", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("", 503));

    await expect(auditRepoImpl.list()).rejects.toThrow("Upstream error");
  });

  it("applies the same handling to getById and delete", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "nope" }, 403));
    await expect(auditRepoImpl.getById("a-1")).rejects.toThrow("nope");

    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "nope" }, 403));
    await expect(auditRepoImpl.delete("a-1")).rejects.toThrow("nope");
  });
});

// ---------------------------------------------------------------------------
// AuditsApiError
// ---------------------------------------------------------------------------

describe("AuditsApiError", () => {
  it("keeps the status when provided", () => {
    const err = new AuditsApiError("boom", 418);
    expect(err.status).toBe(418);
    expect(err.name).toBe("AuditsApiError");
  });

  it("omits the status when not provided", () => {
    const err = new AuditsApiError("boom");
    expect(err.status).toBeUndefined();
    expect(err.message).toBe("boom");
  });
});

describe("module exports", () => {
  it("exposes the same instance as named and default export", () => {
    expect(auditRepoDefault).toBe(auditRepoImpl);
  });
});
