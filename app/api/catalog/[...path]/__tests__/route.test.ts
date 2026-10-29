/** @vitest-environment node */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

const state = vi.hoisted(() => ({
  role: "admin" as string | null,
  token: "token" as string | undefined,
}));
vi.mock("@processes/auth/session", () => ({
  getServerSession: async () => ({
    authenticated: Boolean(state.role),
    user: state.role ? { role: state.role } : null,
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.token ? { value: state.token } : undefined),
  }),
}));
vi.mock("@shared/config/env", () => ({
  PublicEnv: { apiBaseUrl: "https://backend.example/api", httpTimeoutMs: 5000 },
  serverEnv: () => ({ cookies: { accessName: "access" } }),
}));
const operationId = "b9656428-2d01-4532-8ef0-e36dc80de6ce";
const file = { file_name: "catalog.xlsx", file_content: "UEsDBA==" };
function call(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
) {
  const [pathname, query] = path.split("?");
  const req = new NextRequest(`http://localhost/api/catalog/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
  void query;
  return (method === "GET" ? GET : POST)(req, {
    params: Promise.resolve({ path: pathname.split("/") }),
  });
}
beforeEach(() => {
  state.role = "admin";
  state.token = "token";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ message: "ok" })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("Catalog admin BFF", () => {
  it.each([
    { origin: "https://evil.example", type: "application/json", status: 403 },
    { origin: "https://evil.example", type: "text/plain", status: 403 },
    { origin: "http://localhost", type: "text/plain", status: 415 },
  ])("rejects cross-origin or simple-form writes before proxy: %j", async ({ origin, type, status }) => {
    const req = new NextRequest("http://localhost/api/catalog/upload", {
      method: "POST",
      headers: { origin, "content-type": type },
      body: JSON.stringify({ ...file, operation_id: operationId, expected_revision: "legacy:0" }),
    });
    expect((await POST(req, { params: Promise.resolve({ path: ["upload"] }) })).status).toBe(status);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the request Host when Next binds to an internal address", async () => {
    const req = new NextRequest("http://0.0.0.0:3001/api/catalog/validate", {
      method: "POST",
      headers: { host: "localhost:3001", origin: "http://localhost:3001", "content-type": "application/json" },
      body: JSON.stringify(file),
    });
    expect((await POST(req, { params: Promise.resolve({ path: ["validate"] }) })).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("accepts same-origin JSON writes including charset", async () => {
    const req = new NextRequest("http://localhost/api/catalog/validate", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(file),
    });
    expect((await POST(req, { params: Promise.resolve({ path: ["validate"] }) })).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    "status",
    "versions",
    `operations/${operationId}`,
    "validate",
    "upload",
    "activate",
  ])("rejects absent verified session for %s", async (path) => {
    state.role = null;
    expect(
      (
        await call(
          path,
          ["validate", "upload", "activate"].includes(path) ? {} : undefined,
        )
      ).status,
    ).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["viewer", "auditor", "qc"])(
    "rejects %s before calling backend",
    async (role) => {
      state.role = role;
      expect((await call("status")).status).toBe(403);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("preserves the proxy cookie requirement even after role verification", async () => {
    state.token = undefined;
    expect((await call("status")).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    "{",
    null,
    [],
    {},
    { ...file, file_content: 42 },
    { ...file, file_name: "bad.csv" },
    { ...file, file_content: "%%%" },
  ])("rejects bad validation body %j before upstream", async (body) => {
    expect((await call("validate", body)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects files larger than 3 MiB before upstream", async () => {
    expect(
      (
        await call("validate", {
          ...file,
          file_content: Buffer.alloc(3145729).toString("base64"),
        })
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { ...file },
    { ...file, operation_id: "not-a-uuid", expected_revision: "legacy:0" },
    { ...file, operation_id: operationId, expected_revision: "" },
  ])(
    "requires UI operation identity and revision on upload %j",
    async (body) => {
      expect((await call("upload", body)).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { version: "v1", operation_id: operationId },
    { version: "", operation_id: operationId, expected_revision: "r1" },
  ])("rejects incomplete restore %j", async (body) => {
    expect((await call("activate", body)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("forwards only allowed history query parameters and caps at 100", async () => {
    await call("versions?limit=20&cursor=next%2Fpage&evil=value");
    expect(fetch).toHaveBeenCalledWith(
      "https://backend.example/api/admin/catalog/versions?limit=20&cursor=next%2Fpage",
      expect.objectContaining({ cache: "no-store" }),
    );
    vi.mocked(fetch).mockClear();
    expect((await call("versions?limit=101")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("forwards valid validation without an activation request", async () => {
    await call("validate", file);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://backend.example/api/admin/catalog/validate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(file),
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
  });
  it("preserves in-progress status and exact upload identity", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json(
        { status: "running", operation_id: operationId },
        { status: 202 },
      ),
    );
    const body = {
      ...file,
      operation_id: operationId,
      expected_revision: "legacy:0",
    };
    const res = await call("upload", body);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({
      status: "running",
      operation_id: operationId,
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/upload"),
      expect.objectContaining({ body: JSON.stringify(body) }),
    );
  });
  it("forwards restore with the expected revision", async () => {
    const body = {
      version: "legacy",
      expected_revision: "r2",
      operation_id: operationId,
    };
    await call("activate", body);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/activate"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual(
      body,
    );
  });
  it("rejects unknown paths and methods instead of proxying arbitrary resources", async () => {
    expect((await call("status/admin")).status).toBe(404);
    expect((await call("status", {}, "POST")).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("allows a verified administrator through the shared proxy", async () => {
    state.role = "administrator";
    expect((await call("status")).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects a missing POST body before upstream", async () => {
    expect((await call("validate", undefined, "POST")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("bounds streamed JSON independently of Content-Length", async () => {
    const res = await call("validate", "x".repeat(4 * 1024 * 1024 + 4097));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      message: "Catalog request exceeds the 3 MiB file limit",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects declared oversized bodies before reading them", async () => {
    const req = new NextRequest("http://localhost/api/catalog/validate", {
      method: "POST",
      body: "{}",
      headers: { "content-length": "9999999", "content-type": "application/json" },
    });
    expect(
      (await POST(req, { params: Promise.resolve({ path: ["validate"] }) }))
        .status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects malformed operation IDs instead of forwarding a path", async () => {
    expect((await call("operations/..%2Fsecret")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps backend conflict status and message without retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json(
        { message: "The active revision has changed" },
        { status: 409 },
      ),
    );
    const res = await call("upload", {
      ...file,
      operation_id: operationId,
      expected_revision: "r1",
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      message: "The active revision has changed",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reads an operation result by its encoded single path segment", async () => {
    const operation = {
      operation_id: operationId,
      status: "completed",
      kind: "upload",
      message: "Catalog replaced",
    };
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(operation));
    const response = await call(`operations/${operationId}`);
    expect(await response.json()).toEqual(operation);
    expect(fetch).toHaveBeenCalledWith(
      `https://backend.example/api/admin/catalog/operations/${operationId}`,
      expect.objectContaining({ method: "GET" }),
    );
  });
  it("rejects empty operation path segments", async () => {
    expect((await call("operations/")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Catalog asynchronous and browsing routes", () => {
  it("forwards only allowed browsing filters with pages up to 200", async () => {
    expect((await call("items?version=v1&q=ramp&flow_id=F&barrier_id=B&cursor=next&limit=200&secret=bad")).status).toBe(200);
    const target = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(Object.fromEntries(target.searchParams)).toEqual({ version: "v1", q: "ramp", flow_id: "F", barrier_id: "B", cursor: "next", limit: "200" });
  });
  it("preserves the asynchronous 202 import response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ operation_id: operationId, status: "queued" }, { status: 202 }));
    const response = await call("imports", { ...file, operation_id: operationId, expected_revision: "r1" });
    expect(response.status).toBe(202);
    expect((await response.json()).status).toBe("queued");
  });
  it.each(["items", "operations", "imports"])("requires administration for %s", async resource => {
    state.role = "viewer";
    expect((await call(resource, resource === "imports" ? {} : undefined)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("lists saved operations using only pagination parameters", async () => {
    await call("operations?cursor=next&limit=20&role=admin");
    const target = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(target.pathname).toBe("/api/admin/catalog/operations");
    expect(Object.fromEntries(target.searchParams)).toEqual({ cursor: "next", limit: "20" });
  });
});

it("rejects catalog pages above the shared maximum before upstream", async () => {
  expect((await call("items?limit=201")).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

it("validates CRUD bodies and encodes both row identifiers", async () => {
  const { PUT, DELETE } = await import("../route");
  const body = { operation_id: operationId, base_version: "v1", expected_revision: "r1", item: { flow_id: "FLOW", barrier_id: "B1", question_code: "01", question: "Safe?", mitigation_id: "M1", barrier_statement: "Steps", proposed_mitigation: "Ramp", adas_reference: "ADA", cost: 0, unit: "each" } };
  const context = { params: Promise.resolve({ path: ["items", "FLOW", "B1#01"] }) };
  const req = (method: string, value: unknown) => new NextRequest("http://localhost/api/catalog/items/FLOW/B1%2301", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
  expect((await PUT(req("PUT", body), context)).status).toBe(200);
  expect(fetch).toHaveBeenLastCalledWith("https://backend.example/api/admin/catalog/items/FLOW/B1%2301", expect.objectContaining({ method: "PUT" }));
  expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string)).toEqual(body);
  expect((await DELETE(req("DELETE", { ...body, item: undefined }), context)).status).toBe(200);
  expect((await PUT(req("PUT", { ...body, item: { ...body.item, cost: -1 } }), context)).status).toBe(400);
});
it("exports only the chosen version as bounded binary while preserving JSON failures", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(new Uint8Array([80, 75, 3, 4]), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": 'attachment; filename="catalog.xlsx"' } }));
  const response = await call("export?version=v1&q=ignore&cursor=ignore");
  expect(response.headers.get("content-type")).toContain("spreadsheetml");
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([80, 75, 3, 4]);
  expect(fetch).toHaveBeenLastCalledWith("https://backend.example/api/admin/catalog/export?version=v1", expect.any(Object));
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ message: "Version unavailable" }, { status: 409 }));
  const failure = await call("export?version=v1");
  expect(failure.status).toBe(409);
  expect(await failure.json()).toEqual({ message: "Version unavailable" });
  vi.mocked(fetch).mockResolvedValueOnce(new Response("too large", { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-length": "4000000" } }));
  expect((await call("export?version=v1")).status).toBe(502);
});

it.each([
  { path: ["items"], method: "POST" },
  { path: ["items", "FLOW", "B1#01"], method: "PUT" },
  { path: ["items", "FLOW", "B1#01"], method: "DELETE" },
])("protects CRUD $method with verified session, role, origin and validated body", async ({ path, method }) => {
  const routes = await import("../route");
  const handle = routes[method as "POST" | "PUT" | "DELETE"];
  const payload = { operation_id: operationId, base_version: "v1", expected_revision: "r1", ...(method !== "DELETE" ? { item: { flow_id: "FLOW", barrier_id: "B1", question_code: "01", question: "Safe?", mitigation_id: "M1", barrier_statement: "Steps", proposed_mitigation: "Ramp", adas_reference: "ADA", cost: null, unit: "each" } } : {}) };
  const execute = (body: unknown = payload, origin = "http://localhost", type = "application/json") => handle(new NextRequest("http://localhost/api/catalog/items", { method, headers: { origin, "content-type": type }, body: typeof body === "string" ? body : JSON.stringify(body) }), { params: Promise.resolve({ path }) });
  state.role = null;
  expect((await execute()).status).toBe(401);
  state.role = "auditor";
  expect((await execute()).status).toBe(403);
  state.role = "admin";
  expect((await execute(payload, "https://evil.example")).status).toBe(403);
  expect((await execute(payload, "http://localhost", "text/plain")).status).toBe(415);
  expect((await execute("{")).status).toBe(400);
  expect((await execute({ ...payload, base_version: "" })).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
  expect((await execute()).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(["question", "barrier_statement", "adas_reference"])("rejects a missing required %s before calling the backend", async field => {
  const item = { flow_id: "FLOW", barrier_id: "B1", question_code: "01", question: "Safe?", mitigation_id: "", barrier_statement: "Steps", proposed_mitigation: "", adas_reference: "ADA", cost: null, unit: "", [field]: "" };
  expect((await call("items", { operation_id: operationId, base_version: "v1", expected_revision: "r1", item })).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
