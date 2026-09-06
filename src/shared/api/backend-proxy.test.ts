import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), serverEnv: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@shared/config/env", () => ({
  serverEnv: mocks.serverEnv,
  PublicEnv: { apiBaseUrl: "http://backend.test/" },
}));

import { proxyBackend, proxyBackendJson, proxyBackendQuery } from "./backend-proxy";

describe("proxyBackend", () => {
  beforeEach(() => {
    mocks.serverEnv.mockReturnValue({ cookies: { accessName: "access_token" } });
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: "token" })) });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("requires a token", async () => {
    mocks.cookies.mockResolvedValueOnce({ get: vi.fn(() => undefined) });
    expect((await proxyBackend("/jobs/1", "GET")).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards JSON requests and responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: { "content-type": "application/json" },
      })
    );
    const response = await proxyBackend("/jobs/1", "POST", { retry: true });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "http://backend.test/jobs/1",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ retry: true }), redirect: "error" })
    );
  });

  it("maps text and transport failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("missing", { status: 404 }));
    expect(await (await proxyBackend("/jobs/x", "GET")).json()).toEqual({ message: "missing" });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    expect((await proxyBackend("/jobs/x", "DELETE")).status).toBe(502);
  });

  it("parses JSON commands and rejects malformed bodies", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { headers: { "content-type": "application/json" } }));
    await proxyBackendJson(new Request("http://localhost", { method: "POST", body: '{"name":"A"}' }), "/items", "POST");
    expect(fetch).toHaveBeenLastCalledWith("http://backend.test/items", expect.objectContaining({ body: '{"name":"A"}' }));
    expect((await proxyBackendJson(new Request("http://localhost", { method: "POST", body: "{" }), "/items", "POST")).status).toBe(400);
  });

  it("forwards renamed allowlisted query parameters", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } }));
    await proxyBackendQuery(
      new Request("http://localhost?projectId=p%2F1&limit=10&ignored=x"),
      "/facilities",
      [["projectId", "project_id"], "limit"],
      { maxLimit: 200 }
    );
    expect(fetch).toHaveBeenLastCalledWith("http://backend.test/facilities?project_id=p%2F1&limit=10", expect.anything());
  });

  it("validates required queries and numeric limits", async () => {
    expect((await proxyBackendQuery(new Request("http://localhost"), "/comments", ["audit_id"], { required: ["audit_id"] })).status).toBe(400);
    expect((await proxyBackendQuery(new Request("http://localhost?limit=bad"), "/audits", ["limit"], { maxLimit: 200 })).status).toBe(400);
    expect((await proxyBackendQuery(new Request("http://localhost?limit=201"), "/audits", ["limit"], { maxLimit: 200 })).status).toBe(400);
  });
});
