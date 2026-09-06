import { describe, expect, it } from "vitest";
import type { AxiosError } from "axios";
import { createApiError, createApiErrorFromAwsLike, createApiErrorFromAxios } from "../error";

// axiosError builds the minimal shape the normalizer reads. The message is left
// out on purpose: an empty string would win over the default message.
const axiosError = (overrides: Partial<AxiosError>): AxiosError =>
  ({ isAxiosError: true, name: "AxiosError", ...overrides }) as AxiosError;

describe("codeFromStatus", () => {
  const cases: Array<[number, string, string]> = [
    [401, "UNAUTHORIZED", "You are not authorized to perform this action."],
    [403, "FORBIDDEN", "Access to this resource is forbidden."],
    [404, "NOT_FOUND", "The requested resource was not found."],
    [409, "CONFLICT", "The request could not be completed due to a conflict."],
    [422, "UNPROCESSABLE_ENTITY", "The server could not process the request."],
    [429, "RATE_LIMITED", "Too many requests. Please slow down and try again."],
    [500, "SERVER_ERROR", "Unexpected server error. Please try again later."],
    [503, "SERVER_ERROR", "Unexpected server error. Please try again later."],
    [400, "BAD_REQUEST", "Invalid request. Please review the submitted data."],
    [418, "BAD_REQUEST", "Invalid request. Please review the submitted data."],
  ];

  it.each(cases)("maps %i to %s with its default message", (status, code, message) => {
    const error = createApiErrorFromAxios(axiosError({ response: { status } as never }));
    expect(error).toMatchObject({ code, message });
  });

  it("ignores a status below 400", () => {
    const error = createApiErrorFromAxios(axiosError({ response: { status: 302 } as never }));
    expect(error.code).toBe("UNKNOWN_ERROR");
  });
});

describe("default messages of the transport codes", () => {
  const cases: Array<[string, string, string]> = [
    ["ECONNABORTED", "TIMEOUT", "The request timed out. Please try again."],
    ["ERR_NETWORK", "NETWORK_ERROR", "Network error. Please check your connection and try again."],
    ["ERR_CANCELED", "CANCELED", "The request was canceled."],
  ];

  it.each(cases)("maps %s to %s with its default message", (axiosCode, code, message) => {
    expect(createApiErrorFromAxios(axiosError({ code: axiosCode }))).toMatchObject({ code, message });
  });

  it("falls back to the generic message for an unknown code", () => {
    expect(createApiErrorFromAxios(axiosError({ code: "ERR_WEIRD" }))).toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "Request failed. Please try again.",
    });
  });
});

describe("createApiErrorFromAxios details", () => {
  it("defaults the method when the request config carries none", () => {
    const error = createApiErrorFromAxios(axiosError({ config: { url: "/api/audits" } as never }));
    expect(error.details).toMatchObject({ method: "GET", url: "/api/audits" });
  });

  it("keeps the method the request declared", () => {
    const error = createApiErrorFromAxios(
      axiosError({ config: { url: "/api/audits", method: "post" } as never }),
    );
    expect(error.details).toMatchObject({ method: "POST" });
  });

  it("prefers the message carried by the payload", () => {
    const error = createApiErrorFromAxios(
      axiosError({ message: "Request failed", response: { status: 400, data: { message: "Bad id" } } as never }),
    );
    expect(error.message).toBe("Bad id");
  });

  it("falls back to the axios message when the payload carries none", () => {
    const error = createApiErrorFromAxios(
      axiosError({ message: "socket hang up", response: { status: 500, data: { detail: "x" } } as never }),
    );
    expect(error.message).toBe("socket hang up");
  });

  it("ignores an array payload", () => {
    const error = createApiErrorFromAxios(
      axiosError({ response: { status: 404, data: [{ message: "nope" }] } as never }),
    );
    expect(error).toMatchObject({ code: "NOT_FOUND", message: "The requested resource was not found." });
  });

  it("ignores an object payload with no recognisable field", () => {
    const error = createApiErrorFromAxios(
      axiosError({ response: { status: 409, data: { other: 1 } } as never }),
    );
    expect(error.code).toBe("CONFLICT");
  });
});

describe("createApiErrorFromAwsLike", () => {
  it("keeps only the segment after the hash", () => {
    expect(
      createApiErrorFromAwsLike({ __type: "com.amazon.cognito#NotAuthorizedException" }),
    ).toMatchObject({ code: "NotAuthorizedException" });
  });

  it("ignores a blank type and falls back to the status", () => {
    expect(createApiErrorFromAwsLike({ __type: "   " }, 403)).toMatchObject({ code: "FORBIDDEN" });
  });

  it("ignores a blank message and uses the fallback", () => {
    expect(createApiErrorFromAwsLike({ __type: "X", message: "   " }, 400, "from axios")).toMatchObject({
      message: "from axios",
    });
  });

  it("trims the provider message", () => {
    expect(createApiErrorFromAwsLike({ __type: "X", message: "  boom  " })).toMatchObject({
      message: "boom",
    });
  });
});

describe("createApiError", () => {
  it("reads the message of a plain object", () => {
    expect(createApiError({ message: "plain failure" })).toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "plain failure",
    });
  });

  it("falls back to the generic message when there is none", () => {
    expect(createApiError({})).toMatchObject({ message: "Request failed. Please try again." });
  });

  it("falls back to the generic message for a primitive", () => {
    expect(createApiError("boom")).toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "Request failed. Please try again.",
    });
  });
});
