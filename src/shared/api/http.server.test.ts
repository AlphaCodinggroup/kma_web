import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  cookies: vi.fn(),
  getCookie: vi.fn(),
  request: vi.fn(),
  requestUse: vi.fn(),
  responseUse: vi.fn(),
  env: {
    cookies: { accessName: "access_cookie" },
    httpRetry: { maxAttempts: 1, baseDelayMs: 0 },
  },
}));

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: { ...actual.default, create: mocks.create },
  };
});
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@shared/config/env", () => ({
  serverEnv: () => mocks.env,
  PublicEnv: { authBaseUrl: "https://cognito.example" },
}));

import { AxiosHeaders } from "axios";
import { cognitoHttp, createServerHttp, serverHttp } from "./http.server";

function newInstance() {
  const instance = {
    defaults: { headers: {} as Record<string, unknown> },
    interceptors: {
      request: { use: mocks.requestUse },
      response: { use: mocks.responseUse },
    },
    request: mocks.request,
  };
  mocks.create.mockReturnValue(instance);
  return instance;
}

describe("server HTTP factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ get: mocks.getCookie });
    mocks.getCookie.mockReturnValue({ value: "access-token" });
    newInstance();
  });

  it("creates the default server client and merges plain initial headers", () => {
    const instance = createServerHttp({ headers: { "X-Test": "yes", Skip: undefined } });
    expect(mocks.create).toHaveBeenCalledWith({
      baseURL: "/",
      timeout: 30_000,
      headers: { Accept: "application/json" },
      withCredentials: false,
      validateStatus: expect.any(Function),
    });
    expect(instance.defaults.headers).toMatchObject({ "X-Test": "yes" });
    const validateStatus = mocks.create.mock.calls[0][0].validateStatus;
    expect(validateStatus(500)).toBe(true);
  });

  it("merges AxiosHeaders through its normalized representation", () => {
    const headers = new AxiosHeaders();
    headers.set("X-Trace", "trace-1");
    const instance = createServerHttp({ headers });
    expect(instance.defaults.headers).toMatchObject({ "X-Trace": "trace-1" });
  });

  it("adds the bearer token from the configured cookie", async () => {
    createServerHttp({ withAuthCookie: true });
    const requestSuccess = mocks.requestUse.mock.calls[0][0];
    const config = { headers: new AxiosHeaders() };
    await expect(requestSuccess(config)).resolves.toBe(config);
    expect(config.headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("leaves auth absent when the cookie is missing or inaccessible", async () => {
    createServerHttp({ withAuthCookie: true });
    const requestSuccess = mocks.requestUse.mock.calls[0][0];

    mocks.getCookie.mockReturnValueOnce(undefined);
    const missing = { headers: {} as Record<string, unknown> };
    await requestSuccess(missing);
    expect(missing.headers).not.toHaveProperty("Authorization");

    mocks.cookies.mockRejectedValueOnce(new Error("headers unavailable"));
    const unavailable = {} as { headers?: Record<string, unknown> };
    await requestSuccess(unavailable);
    expect(unavailable.headers).toBeUndefined();
  });

  it("returns successful responses unchanged", async () => {
    createServerHttp();
    const responseSuccess = mocks.responseUse.mock.calls[0][0];
    const response = { status: 204, data: undefined };
    await expect(responseSuccess(response)).resolves.toBe(response);
  });

  it.each([429, 500, 599])("retries transient HTTP %s responses once", async (status) => {
    const instance = createServerHttp();
    const responseSuccess = mocks.responseUse.mock.calls[0][0];
    const retried = { status: 200 };
    mocks.request.mockResolvedValue(retried);
    const config = { url: "/resource" };
    await expect(responseSuccess({ status, data: {}, config })).resolves.toBe(retried);
    expect(instance.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/resource", __retryCount: 1 })
    );
  });

  it("throws a normalized server message after retries are exhausted", async () => {
    createServerHttp();
    const responseSuccess = mocks.responseUse.mock.calls[0][0];
    const config = { url: "/resource", __retryCount: 1 };
    const promise = responseSuccess({ status: 503, statusText: "Unavailable", data: { message: "busy" }, config });
    await expect(promise).rejects.toMatchObject({
      message: "busy",
      status: 503,
      url: "/resource",
    });
  });

  it("builds a fallback HTTP error for non-retriable responses", async () => {
    createServerHttp();
    const responseSuccess = mocks.responseUse.mock.calls[0][0];
    await expect(
      responseSuccess({ status: 404, statusText: "Not Found", data: {}, config: {} })
    ).rejects.toMatchObject({
      message: 'HTTP 404 Not Found on ""',
      status: 404,
      url: "",
    });
  });

  it("uses a string response body as the server message", async () => {
    createServerHttp();
    const responseSuccess = mocks.responseUse.mock.calls[0][0];
    await expect(
      responseSuccess({ status: 400, data: "invalid", config: { url: "/input" } })
    ).rejects.toThrow("invalid");
  });

  it("normalizes transport errors using response, provider and fallback messages", async () => {
    createServerHttp();
    const responseFailure = mocks.responseUse.mock.calls[0][1];
    const provider = { message: "network", response: { data: { message: "upstream" } } };
    expect(() => responseFailure(provider)).toThrow("upstream");
    expect(() => responseFailure({ message: "network" })).toThrow("network");
    expect(() => responseFailure({})).toThrow("Network request failed.");
  });

  it("builds generic and Cognito convenience clients", () => {
    serverHttp();
    expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ baseURL: "/" }));

    const cognito = newInstance();
    expect(cognitoHttp()).toBe(cognito);
    expect(mocks.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        baseURL: "https://cognito.example",
        withCredentials: false,
      })
    );
    expect(cognito.defaults.headers).toMatchObject({
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    });
  });
});
