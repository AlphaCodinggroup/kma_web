// ---------------------------------------------------------------------------
// Tests for error normalization utilities
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import type { AxiosError } from "axios";
import {
  isApiError,
  createApiError,
  createApiErrorFromAxios,
  createApiErrorFromAwsLike,
  type ApiError,
} from "../error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal AxiosError-like object for testing. */
function fakeAxiosError(
  overrides: {
    status?: number;
    data?: unknown;
    code?: string;
    message?: string;
    url?: string;
    method?: string;
  } = {}
): AxiosError {
  const {
    status,
    data,
    code,
    message = "Request failed",
    url = "/api/test",
    method = "get",
  } = overrides;

  return {
    isAxiosError: true,
    name: "AxiosError",
    message,
    code,
    config: { url, method } as any,
    response: status
      ? ({
          status,
          statusText: "",
          data,
          headers: {},
          config: { url, method } as any,
        } as any)
      : undefined,
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

// ---------------------------------------------------------------------------
// isApiError
// ---------------------------------------------------------------------------

describe("isApiError", () => {
  it("returns true for a valid ApiError object", () => {
    const err: ApiError = { code: "TEST", message: "test" };
    expect(isApiError(err)).toBe(true);
  });

  it("returns true when details is present", () => {
    expect(isApiError({ code: "A", message: "b", details: { x: 1 } })).toBe(
      true
    );
  });

  it("returns false for null / undefined / primitives", () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError("string")).toBe(false);
    expect(isApiError(42)).toBe(false);
  });

  it("returns false when code is missing", () => {
    expect(isApiError({ message: "m" })).toBe(false);
  });

  it("returns false when message is missing", () => {
    expect(isApiError({ code: "C" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createApiErrorFromAxios — status code mapping
// ---------------------------------------------------------------------------

describe("createApiErrorFromAxios", () => {
  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "UNPROCESSABLE_ENTITY"],
    [429, "RATE_LIMITED"],
    [500, "SERVER_ERROR"],
    [502, "SERVER_ERROR"],
    [503, "SERVER_ERROR"],
    [400, "BAD_REQUEST"],
    [418, "BAD_REQUEST"], // any other 4xx
  ])("maps HTTP %i to code %s", (status, expectedCode) => {
    const err = fakeAxiosError({ status, data: {} });
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe(expectedCode);
    expect(isApiError(result)).toBe(true);
  });

  it("maps ECONNABORTED to TIMEOUT", () => {
    const err = fakeAxiosError({ code: "ECONNABORTED" });
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe("TIMEOUT");
  });

  it("maps ERR_NETWORK to NETWORK_ERROR", () => {
    const err = fakeAxiosError({ code: "ERR_NETWORK" });
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe("NETWORK_ERROR");
  });

  it("maps ERR_CANCELED to CANCELED", () => {
    const err = fakeAxiosError({ code: "ERR_CANCELED" });
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe("CANCELED");
  });

  it("falls back to UNKNOWN_ERROR when no status and no known code", () => {
    const err = fakeAxiosError({});
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe("UNKNOWN_ERROR");
  });

  it("extracts message from response body when available", () => {
    const err = fakeAxiosError({
      status: 400,
      data: { message: "Field X is invalid" },
    });
    const result = createApiErrorFromAxios(err);

    expect(result.message).toBe("Field X is invalid");
  });

  it("uses AxiosError.message as fallback message", () => {
    const err = fakeAxiosError({
      status: 400,
      data: {},
      message: "Axios says bad request",
    });
    const result = createApiErrorFromAxios(err);

    expect(result.message).toBe("Axios says bad request");
  });

  it("includes url and method in details", () => {
    const err = fakeAxiosError({
      status: 404,
      data: {},
      url: "/api/users/123",
      method: "delete",
    });
    const result = createApiErrorFromAxios(err);

    expect(result.details).toMatchObject({
      url: "/api/users/123",
      method: "DELETE",
    });
  });
});

// ---------------------------------------------------------------------------
// createApiErrorFromAxios — AWS Cognito-like error payloads
// ---------------------------------------------------------------------------

describe("createApiErrorFromAxios — AWS Cognito-like errors", () => {
  it("detects __type and extracts short code after #", () => {
    const err = fakeAxiosError({
      status: 400,
      data: {
        __type:
          "com.amazonaws.cognito.identity.idp.model#NotAuthorizedException",
        message: "Incorrect username or password.",
      },
    });
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe("NotAuthorizedException");
    expect(result.message).toBe("Incorrect username or password.");
  });

  it("detects simple __type without hash prefix", () => {
    const err = fakeAxiosError({
      status: 400,
      data: {
        __type: "UserNotFoundException",
        message: "User does not exist.",
      },
    });
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe("UserNotFoundException");
    expect(result.message).toBe("User does not exist.");
  });

  it("falls back to code field when __type is missing", () => {
    const err = fakeAxiosError({
      status: 400,
      data: {
        code: "LimitExceededException",
        message: "Too many attempts.",
      },
    });
    const result = createApiErrorFromAxios(err);

    expect(result.code).toBe("LimitExceededException");
  });

  it("falls back to error field detection", () => {
    const err = fakeAxiosError({
      status: 400,
      data: {
        error: "invalid_grant",
        message: "Token has been revoked.",
      },
    });
    const result = createApiErrorFromAxios(err);

    // The error field is detected as AWS-like; code falls back to status
    expect(result.message).toBe("Token has been revoked.");
  });
});

// ---------------------------------------------------------------------------
// createApiErrorFromAwsLike (direct)
// ---------------------------------------------------------------------------

describe("createApiErrorFromAwsLike", () => {
  it("normalizes a full AWS error object", () => {
    const result = createApiErrorFromAwsLike(
      {
        __type: "NotAuthorizedException",
        message: "Incorrect username or password.",
      },
      400,
      "Auth failed"
    );

    expect(result).toEqual({
      code: "NotAuthorizedException",
      message: "Incorrect username or password.",
      details: {
        provider: "aws-cognito",
        status: 400,
        raw: {
          __type: "NotAuthorizedException",
          message: "Incorrect username or password.",
        },
      },
    });
  });

  it("uses fallback message when provider message is empty", () => {
    const result = createApiErrorFromAwsLike(
      { __type: "InternalError", message: "" },
      500,
      "Something went wrong"
    );

    expect(result.message).toBe("Something went wrong");
  });

  it("uses default message when both provider and fallback are empty", () => {
    const result = createApiErrorFromAwsLike(
      { __type: "InternalError", message: "" },
      500
    );

    // Should get the default message for the code (not empty)
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("derives code from status when __type and code are missing", () => {
    const result = createApiErrorFromAwsLike({ message: "error" }, 401);

    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("falls back to UNKNOWN_ERROR when nothing is available", () => {
    const result = createApiErrorFromAwsLike({});

    expect(result.code).toBe("UNKNOWN_ERROR");
  });
});

// ---------------------------------------------------------------------------
// createApiError (universal normalizer)
// ---------------------------------------------------------------------------

describe("createApiError", () => {
  it("returns an existing ApiError as-is", () => {
    const original: ApiError = {
      code: "CUSTOM",
      message: "custom msg",
      details: { x: 1 },
    };
    const result = createApiError(original);

    expect(result).toBe(original); // same reference
  });

  it("normalizes an AxiosError (by detecting isAxiosError)", () => {
    const axiosErr = fakeAxiosError({ status: 404, data: {} });
    const result = createApiError(axiosErr);

    expect(result.code).toBe("NOT_FOUND");
    expect(isApiError(result)).toBe(true);
  });

  it("normalizes a standard Error to UNKNOWN_ERROR", () => {
    const err = new Error("Something broke");
    const result = createApiError(err);

    expect(result.code).toBe("UNKNOWN_ERROR");
    expect(result.message).toBe("Something broke");
  });

  it("normalizes null to UNKNOWN_ERROR with default message", () => {
    const result = createApiError(null);

    expect(result.code).toBe("UNKNOWN_ERROR");
    expect(result.message).toBe("Request failed. Please try again.");
  });

  it("normalizes undefined to UNKNOWN_ERROR", () => {
    const result = createApiError(undefined);

    expect(result.code).toBe("UNKNOWN_ERROR");
  });

  it("normalizes a plain string to UNKNOWN_ERROR", () => {
    const result = createApiError("oops");

    expect(result.code).toBe("UNKNOWN_ERROR");
  });

  it("normalizes an object with message to UNKNOWN_ERROR preserving message", () => {
    const result = createApiError({ message: "custom" });

    // Has code and message but missing 'code' field, so isApiError = false,
    // falls through to the generic branch
    expect(result.code).toBe("UNKNOWN_ERROR");
    expect(result.message).toBe("custom");
  });
});

// ---------------------------------------------------------------------------
// isApiError — solapamiento con AxiosError
// ---------------------------------------------------------------------------

describe("isApiError — AxiosError overlap", () => {
  // Un AxiosError trae `code` y `message` string (code = "ERR_NETWORK", etc.),
  // así que sin la guarda de `isAxiosError` se lo daba por ya normalizado y
  // createApiError lo devolvía crudo a quien lo llamara directo.
  it("does not mistake an AxiosError with a code for an ApiError", () => {
    const axiosErr = fakeAxiosError({ code: "ERR_NETWORK", message: "boom" });

    expect(isApiError(axiosErr)).toBe(false);

    const normalised = createApiError(axiosErr);
    expect(normalised).not.toBe(axiosErr);
    expect(normalised.code).toBe("NETWORK_ERROR");
  });

  it("normalises an AxiosError without code", () => {
    const axiosErr = fakeAxiosError({ status: 404, data: {} });

    expect(isApiError(axiosErr)).toBe(false);
    expect(createApiError(axiosErr).code).toBe("NOT_FOUND");
  });

  it("returns an already normalised ApiError untouched", () => {
    const apiError = { code: "NOT_FOUND", message: "missing" } as const;

    expect(isApiError(apiError)).toBe(true);
    expect(createApiError(apiError)).toBe(apiError);
  });
});

// ---------------------------------------------------------------------------
// installErrorInterceptor
// ---------------------------------------------------------------------------

describe("installErrorInterceptor", () => {
  /** Instancia aislada con un adapter que devuelve lo que pida cada caso. */
  async function createClient(
    respond: (config: unknown) => Promise<unknown>
  ) {
    const axios = (await import("axios")).default;
    const { installErrorInterceptor } = await import("../error");
    const client = axios.create({ baseURL: "" });
    installErrorInterceptor(client);
    client.defaults.adapter = respond as never;
    return client;
  }

  /** Construye una respuesta o un AxiosError según el status. */
  function responderFor(status: number, data: unknown) {
    return async (config: unknown) => {
      const { AxiosError } = await import("axios");
      const res = {
        status,
        statusText: "",
        data,
        headers: {},
        config,
      };
      if (status >= 400) {
        throw new AxiosError(
          `Request failed with status code ${status}`,
          "ERR_BAD_RESPONSE",
          config as never,
          null,
          res as never
        );
      }
      return res;
    };
  }

  it("passes 2xx responses through untouched", async () => {
    const client = await createClient(responderFor(200, { ok: true }));

    const res = await client.get("/things");

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
  });

  // Tabla status → código de dominio, verificando además status/url/method.
  it.each([
    [400, "BAD_REQUEST"],
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "UNPROCESSABLE_ENTITY"],
    [429, "RATE_LIMITED"],
    [500, "SERVER_ERROR"],
  ])("normalises HTTP %i into %s with status and message", async (status, code) => {
    const client = await createClient(responderFor(status, { message: "nope" }));

    const err = (await client
      .get("/things")
      .catch((e: unknown) => e)) as ApiError;

    expect(err).toEqual({
      code,
      message: "nope",
      details: expect.objectContaining({
        status,
        url: "/things",
        method: "GET",
      }),
    });
  });

  it("normalises a network error that never got a response", async () => {
    const client = await createClient(async (config: unknown) => {
      const { AxiosError } = await import("axios");
      throw new AxiosError(
        "Network Error",
        "ERR_NETWORK",
        config as never,
        null
      );
    });

    const err = (await client
      .get("/things")
      .catch((e: unknown) => e)) as ApiError;

    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.message).toBe("Network Error");
    expect(err.details).toMatchObject({
      status: undefined,
      axiosCode: "ERR_NETWORK",
      response: undefined,
    });
  });

  it("normalises a timeout", async () => {
    const client = await createClient(async (config: unknown) => {
      const { AxiosError } = await import("axios");
      throw new AxiosError(
        "timeout of 1000ms exceeded",
        "ECONNABORTED",
        config as never,
        null
      );
    });

    const err = (await client
      .get("/things")
      .catch((e: unknown) => e)) as ApiError;

    expect(err.code).toBe("TIMEOUT");
  });

  it.each([
    ["a plain-text body", "<html>Bad gateway</html>"],
    ["an array body", [1, 2, 3]],
    ["a null body", null],
  ])("falls back to the axios message with %s", async (_label, body) => {
    const client = await createClient(responderFor(502, body));

    const err = (await client
      .get("/things")
      .catch((e: unknown) => e)) as ApiError;

    expect(err.code).toBe("SERVER_ERROR");
    expect(err.message).toBe("Request failed with status code 502");
    expect(err.details).toMatchObject({ status: 502, response: body });
  });

  it("keeps the ApiError contract for every normalised error", async () => {
    const client = await createClient(responderFor(418, {}));

    const err = (await client.get("/things").catch((e: unknown) => e)) as ApiError;

    expect(isApiError(err)).toBe(true);
  });
});
