import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  verify: vi.fn(),
  serverEnv: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@shared/auth/verify-access-token", () => ({
  verifyAccessToken: mocks.verify,
}));
vi.mock("@shared/config/env", () => ({ serverEnv: mocks.serverEnv }));

import { PUT } from "./route";

const allowedUrl = "http://localstack:4566/kma-audit-images/object.png";

function request(
  url: string | null = allowedUrl,
  contentType = "image/png",
  body: BodyInit = new Uint8Array([1, 2, 3]),
  contentLength?: string
) {
  const query = url === null ? "" : `?url=${encodeURIComponent(Buffer.from(url).toString("base64"))}`;
  const headers = new Headers({ "content-type": contentType });
  const result = new NextRequest(`http://localhost/api/uploads/proxy${query}`, {
    method: "PUT",
    headers,
    body,
  });
  if (contentLength !== undefined) result.headers.set("content-length", contentLength);
  return result;
}

describe("upload proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: "access-token" })) });
    mocks.verify.mockResolvedValue({ sub: "user-1" });
    mocks.serverEnv.mockReturnValue({
      cookies: { accessName: "access_token" },
      uploads: {
        allowedHosts: ["localstack", "kma-audit-images.s3.us-east-2.amazonaws.com"],
        allowedBuckets: ["kma-audit-images"],
        maxBytes: 4,
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 200 })));
  });

  it("requires an authenticated and authorized session", async () => {
    mocks.cookies.mockResolvedValueOnce({ get: vi.fn(() => undefined) });
    expect((await PUT(request())).status).toBe(401);

    mocks.verify.mockRejectedValueOnce(new Error("Forbidden"));
    expect((await PUT(request())).status).toBe(403);

    mocks.verify.mockRejectedValueOnce(new Error("bad signature"));
    expect((await PUT(request())).status).toBe(401);
  });

  it.each([
    [null, 400],
    ["%%%", 400],
    ["file:///etc/passwd", 400],
    ["https://user:pass@localstack/kma-audit-images/a.png", 400],
    ["https://example.com/kma-audit-images/a.png", 403],
    ["http://localstack:4566/other-bucket/a.png", 403],
  ])("rejects destination %s", async (url, status) => {
    const encoded = url === "%%%" ? new NextRequest("http://localhost/api/uploads/proxy?url=JSUl", { method: "PUT" }) : request(url);
    expect((await PUT(encoded)).status).toBe(status);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts configured path-style and virtual-host buckets", async () => {
    expect((await PUT(request())).status).toBe(200);
    expect(
      (await PUT(request("https://kma-audit-images.s3.us-east-2.amazonaws.com/a.png"))).status
    ).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ method: "PUT", redirect: "error" })
    );
  });

  it("enforces content type and declared and actual size", async () => {
    expect((await PUT(request(allowedUrl, "text/html"))).status).toBe(415);
    expect((await PUT(request(allowedUrl, "image/png", new Uint8Array([1]), "5"))).status).toBe(413);
    expect((await PUT(request(allowedUrl, "image/png", new Uint8Array([1]), "invalid"))).status).toBe(413);
    expect((await PUT(request(allowedUrl, "image/png", new Uint8Array([1, 2, 3, 4, 5])))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps upstream failures and redirect/network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("denied", { status: 403 }));
    const rejected = await PUT(request());
    expect(rejected.status).toBe(403);
    expect(await rejected.json()).toEqual({ message: "Failed to upload to S3", details: "denied" });

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("redirect rejected"));
    expect((await PUT(request())).status).toBe(500);
  });
});
