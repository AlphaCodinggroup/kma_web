/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxyToBackend } from "../backend-proxy";
const state = vi.hoisted(() => ({ token: "session-token" as string | undefined }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.token ? { value: state.token } : undefined }) }));
vi.mock("@shared/config/env", () => ({ PublicEnv: { apiBaseUrl: "https://backend.example/api", httpTimeoutMs: 5000 }, serverEnv: () => ({ cookies: { accessName: "access" } }) }));
const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const bytes = new Uint8Array([80, 75, 3, 4]);
const request = () => new NextRequest("http://localhost/api/catalog/export?version=v1");
const options = { path: "/admin/catalog/export", forwardQuery: ["version"], binary: { contentType: mime, maxBytes: 8 } };
beforeEach(() => { state.token = "session-token"; vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Bounded binary proxy", () => {
  it("preserves complete bytes and download headers with authenticated upstream access", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes, { headers: { "content-type": mime, "content-length": "4", "content-disposition": 'attachment; filename="version-v1.xlsx"' } })));
    const result = await proxyToBackend(request(), options);
    expect(result.status).toBe(200);
    expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([...bytes]);
    expect(result.headers.get("content-disposition")).toContain("version-v1.xlsx");
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(fetch).toHaveBeenCalledWith("https://backend.example/api/admin/catalog/export?version=v1", expect.objectContaining({ headers: { Authorization: "Bearer session-token", Accept: mime } }));
  });
  it("requires a session before requesting binary data", async () => {
    state.token = undefined; vi.stubGlobal("fetch", vi.fn());
    expect((await proxyToBackend(request(), options)).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { name: "wrong MIME", headers: { "content-type": "text/plain" }, status: 200 },
    { name: "declared oversized body", headers: { "content-type": mime, "content-length": "9" }, status: 200 },
    { name: "truncated body", headers: { "content-type": mime, "content-length": "5" }, status: 200 },
    { name: "partial content", headers: { "content-type": mime, "content-range": "bytes 0-3/100" }, status: 206 },
  ])("rejects $name without returning partial bytes", async ({ headers, status }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes, { status, headers })));
    const result = await proxyToBackend(request(), options);
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({ message: "Bad Gateway" });
  });
  it.each([undefined, "1"])("checks actual streaming size even with content-length=%s", async length => {
    const cancel = vi.fn(); let chunks = 0;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(bytes); chunks += 1; if (chunks === 4) controller.close(); }, cancel });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream, { headers: { "content-type": mime, ...(length ? { "content-length": length } : {}) } })));
    const result = await proxyToBackend(request(), options);
    expect(result.status).toBe(502);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(await result.json()).toEqual({ message: "Bad Gateway" });
  });
  it("returns JSON errors and status intact instead of XLSX", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { message: "Version unavailable" } }, { status: 409 })));
    const result = await proxyToBackend(request(), options);
    expect(result.status).toBe(409);
    expect(result.headers.get("content-type")).toContain("application/json");
    expect(await result.json()).toEqual({ error: { message: "Version unavailable" } });
  });
  it("returns no bytes after an interrupted stream", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.error(new Error("Disconnected")); } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream, { headers: { "content-type": mime } })));
    const result = await proxyToBackend(request(), options);
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({ message: "Bad Gateway" });
  });
});
it("accepts automatically decompressed bytes without comparing compressed wire size", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes, { headers: { "content-type": mime, "content-length": "3", "content-encoding": "gzip" } })));
  const result = await proxyToBackend(request(), options);
  expect(result.status).toBe(200);
  expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([...bytes]);
});
