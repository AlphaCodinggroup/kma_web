// ---------------------------------------------------------------------------
// Tests for the auth interceptor (401 handling, refresh queue, session expiry)
//
// Strategy: We DO NOT mock axios itself (the module-level refreshClient in
// auth.ts would break hoisting). Instead, we import installAuthInterceptor
// and test it by installing on a fresh axios instance that uses a custom
// adapter. For the refresh call, we spy on the module-level refreshClient
// by mocking the entire "../auth" module partially through vi.hoisted.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import axios, { AxiosError, type AxiosResponse } from "axios";

// ---------------------------------------------------------------------------
// We need to control the refreshClient.post call. The auth module creates
// refreshClient at the top level with axios.create(...). We use vi.hoisted
// to create the mock fn early enough, then vi.mock("axios") to intercept
// the create call and wire up our mock.
// ---------------------------------------------------------------------------

const { mockRefreshPost } = vi.hoisted(() => {
  return {
    mockRefreshPost: vi.fn(),
  };
});

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  const originalCreate = actual.default.create.bind(actual.default);

  return {
    ...actual,
    default: {
      ...actual.default,
      create: (...args: Parameters<typeof actual.default.create>) => {
        const instance = originalCreate(...args);
        const cfg = args[0] ?? {};
        // The refreshClient in auth.ts is created with baseURL: "/"
        // and withCredentials: true. We identify it and replace its post.
        if (
          cfg.baseURL === "/" &&
          cfg.withCredentials === true &&
          cfg.timeout === 15_000
        ) {
          instance.post = mockRefreshPost as any;
        }
        return instance;
      },
    },
  };
});

// Must be imported AFTER the vi.mock so it picks up the mocked axios.create
import { installAuthInterceptor } from "../auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeResponse<T>(status: number, data: T): AxiosResponse<T> {
  return {
    status,
    statusText: status === 200 ? "OK" : "Error",
    data,
    headers: {},
    config: { headers: {} },
  } as unknown as AxiosResponse<T>;
}

/**
 * Creates a fresh axios instance with installAuthInterceptor and a custom
 * adapter that delegates to `responseFactory`.
 */
function createTestClient(
  responseFactory: (
    url: string,
    config: any
  ) => Promise<AxiosResponse>,
  options?: { onSessionExpired?: () => void | Promise<void> }
) {
  const client = axios.create({ baseURL: "" });

  installAuthInterceptor(client, options);

  // Custom adapter: short-circuits network and delegates to our factory
  client.defaults.adapter = async (config) => {
    const url = config.url ?? "";
    const res = await responseFactory(url, config);
    res.config = config as any;
    if (res.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${res.status}`,
        "ERR_BAD_REQUEST",
        config as any,
        null,
        res as any
      );
    }
    return res as any;
  };

  return client;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("installAuthInterceptor", () => {
  let onSessionExpired: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSessionExpired = vi.fn();
  });

  // ---- Non-401 errors pass through ------------------------------------

  it("does not intercept non-401 errors", async () => {
    const client = createTestClient(
      async () => fakeResponse(403, { error: "forbidden" }),
      { onSessionExpired }
    );

    await expect(client.get("/api/data")).rejects.toThrow();
    expect(mockRefreshPost).not.toHaveBeenCalled();
  });

  // ---- Non-API URLs are not intercepted --------------------------------

  it("does not intercept 401 on non-api URLs", async () => {
    const client = createTestClient(
      async () => fakeResponse(401, {}),
      { onSessionExpired }
    );

    await expect(client.get("/external/resource")).rejects.toThrow();
    expect(mockRefreshPost).not.toHaveBeenCalled();
  });

  // ---- Excluded paths (session endpoints) are not intercepted ----------

  it("does not intercept 401 on /api/session (login endpoint)", async () => {
    const client = createTestClient(
      async () => fakeResponse(401, {}),
      { onSessionExpired }
    );

    await expect(client.post("/api/session", {})).rejects.toThrow();
    expect(mockRefreshPost).not.toHaveBeenCalled();
  });

  it("does not intercept 401 on /api/session/refresh", async () => {
    const client = createTestClient(
      async () => fakeResponse(401, {}),
      { onSessionExpired }
    );

    await expect(client.post("/api/session/refresh")).rejects.toThrow();
    expect(mockRefreshPost).not.toHaveBeenCalled();
  });

  // ---- Successful refresh and retry ------------------------------------

  it("refreshes and retries the original request on 401", async () => {
    let callCount = 0;

    const client = createTestClient(
      async (url) => {
        if (url === "/api/data") {
          callCount++;
          if (callCount === 1) return fakeResponse(401, {});
          return fakeResponse(200, { data: "success" });
        }
        return fakeResponse(200, {});
      },
      { onSessionExpired }
    );

    mockRefreshPost.mockResolvedValueOnce(fakeResponse(200, { ok: true }));

    const result = await client.get("/api/data");

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ data: "success" });
    expect(mockRefreshPost).toHaveBeenCalledOnce();
    expect(mockRefreshPost).toHaveBeenCalledWith("/api/session/refresh");
  });

  // ---- Refresh failure triggers session expiration ---------------------

  it("calls onSessionExpired when refresh fails with an error", async () => {
    const client = createTestClient(
      async () => fakeResponse(401, {}),
      { onSessionExpired }
    );

    mockRefreshPost.mockRejectedValueOnce(new Error("refresh failed"));

    await expect(client.get("/api/data")).rejects.toBeDefined();

    // onSessionExpired is called fire-and-forget, give it a tick
    await new Promise((r) => setTimeout(r, 20));
    expect(onSessionExpired).toHaveBeenCalled();
  });

  // ---- Refresh returns non-200 triggers session expiration -------------

  it("calls onSessionExpired when refresh returns non-200", async () => {
    const client = createTestClient(
      async () => fakeResponse(401, {}),
      { onSessionExpired }
    );

    // The refresh endpoint itself throws when status !== 200
    mockRefreshPost.mockResolvedValueOnce(fakeResponse(401, {}));

    await expect(client.get("/api/data")).rejects.toBeDefined();

    await new Promise((r) => setTimeout(r, 20));
    expect(onSessionExpired).toHaveBeenCalled();
  });

  // ---- Retry still 401 -> UNAUTHORIZED propagation --------------------

  it("propagates UNAUTHORIZED when retry also returns 401", async () => {
    const client = createTestClient(
      async (url) => {
        if (url === "/api/data") return fakeResponse(401, {});
        return fakeResponse(200, {});
      },
      { onSessionExpired }
    );

    mockRefreshPost.mockResolvedValueOnce(fakeResponse(200, { ok: true }));

    await expect(client.get("/api/data")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(onSessionExpired).toHaveBeenCalled();
  });

  // ---- Concurrent requests queue behind a single refresh ---------------

  it("queues concurrent 401 requests behind a single refresh call", async () => {
    const callCounts: Record<string, number> = {};

    const client = createTestClient(
      async (url) => {
        callCounts[url] = (callCounts[url] ?? 0) + 1;
        // First call to any /api/ path returns 401, subsequent calls succeed
        if (callCounts[url] === 1 && url.startsWith("/api/")) {
          return fakeResponse(401, {});
        }
        return fakeResponse(200, { url });
      },
      { onSessionExpired }
    );

    // Refresh resolves after a small delay to allow queuing
    mockRefreshPost.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(fakeResponse(200, { ok: true })), 50)
        )
    );

    const [r1, r2, r3] = await Promise.all([
      client.get("/api/data1"),
      client.get("/api/data2"),
      client.get("/api/data3"),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);

    // Only ONE refresh call should have been made
    expect(mockRefreshPost).toHaveBeenCalledTimes(1);
  });

  // ---- 2xx responses pass through unchanged ---------------------------

  it("passes through 2xx responses unchanged", async () => {
    const client = createTestClient(
      async () => fakeResponse(200, { hello: "world" }),
      { onSessionExpired }
    );

    const result = await client.get("/api/data");

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ hello: "world" });
    expect(mockRefreshPost).not.toHaveBeenCalled();
  });

  // ---- Works without onSessionExpired callback -------------------------

  it("works without onSessionExpired callback", async () => {
    const client = createTestClient(
      async () => fakeResponse(401, {}),
      // No onSessionExpired provided
    );

    mockRefreshPost.mockRejectedValueOnce(new Error("refresh failed"));

    await expect(client.get("/api/data")).rejects.toBeDefined();
    // Should not throw due to missing callback
  });
});
