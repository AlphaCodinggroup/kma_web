import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const createApiError = vi.fn((error: unknown) => error);
const createApiErrorFromAwsLike = vi.fn(
  (data: unknown, status: number, fallback: string) => ({
    code: "AWS_ERROR",
    message: fallback,
    details: { data, status },
  })
);

vi.mock("@shared/api/http.server", () => ({
  cognitoHttp: () => ({ post }),
}));

vi.mock("@shared/config/env", () => ({
  serverEnv: () => ({ cognito: { clientId: "client-id" } }),
}));

vi.mock("@shared/interceptors/error", () => ({
  createApiError: (error: unknown) => createApiError(error),
  createApiErrorFromAwsLike: (
    data: unknown,
    status: number,
    fallback: string
  ) => createApiErrorFromAwsLike(data, status, fallback),
}));

import {
  globalSignOut,
  initiateAuthWithPassword,
  initiateAuthWithRefreshToken,
} from "./cognito.repo.impl";

const authenticationResult = {
  AccessToken: "access-token",
  ExpiresIn: 3600,
  IdToken: "id-token",
  RefreshToken: "refresh-token",
  TokenType: "Bearer",
};

describe("Cognito auth repository", () => {
  beforeEach(() => {
    post.mockReset();
    createApiError.mockClear();
    createApiErrorFromAwsLike.mockClear();
  });

  it("authenticates with username and password and maps provider tokens", async () => {
    post.mockResolvedValue({ status: 200, data: { AuthenticationResult: authenticationResult } });

    await expect(initiateAuthWithPassword("alice", "secret")).resolves.toEqual({
      accessToken: "access-token",
      idToken: "id-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
    });
    expect(post).toHaveBeenCalledWith("/", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: "client-id",
      AuthParameters: { USERNAME: "alice", PASSWORD: "secret" },
    });
  });

  it.each([
    ["", "secret"],
    ["alice", ""],
  ])("rejects incomplete password credentials", async (username, password) => {
    await expect(initiateAuthWithPassword(username, password)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("refreshes a session and uses an empty refresh token when Cognito omits it", async () => {
    post.mockResolvedValue({
      status: 201,
      data: { AuthenticationResult: { ...authenticationResult, RefreshToken: undefined } },
    });

    await expect(initiateAuthWithRefreshToken("old-refresh")).resolves.toMatchObject({
      accessToken: "access-token",
      refreshToken: "",
    });
    expect(post).toHaveBeenCalledWith("/", {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: "client-id",
      AuthParameters: { REFRESH_TOKEN: "old-refresh" },
    });
  });

  it("rejects an empty refresh token without calling Cognito", async () => {
    await expect(initiateAuthWithRefreshToken("")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { AuthenticationResult: { ...authenticationResult, AccessToken: "" } },
    { AuthenticationResult: { ...authenticationResult, IdToken: "" } },
    { AuthenticationResult: { ...authenticationResult, TokenType: "" } },
    { AuthenticationResult: { ...authenticationResult, ExpiresIn: 0 } },
  ])("rejects incomplete provider responses", async (data) => {
    post.mockResolvedValue({ status: 200, data });
    await expect(initiateAuthWithPassword("alice", "secret")).rejects.toMatchObject({
      code: "INVALID_PROVIDER_RESPONSE",
    });
  });

  it.each([
    [() => initiateAuthWithPassword("alice", "secret"), "Authentication failed."],
    [() => initiateAuthWithRefreshToken("refresh"), "Session refresh failed."],
  ] as const)("maps AWS-like non-success responses", async (operation, fallback) => {
    post.mockResolvedValue({
      status: 401,
      data: { __type: "NotAuthorizedException", message: "Denied" },
    });

    await expect(operation()).rejects.toMatchObject({
      code: "AWS_ERROR",
      message: fallback,
    });
    expect(createApiErrorFromAwsLike).toHaveBeenCalledWith(
      expect.objectContaining({ __type: "NotAuthorizedException" }),
      401,
      fallback
    );
  });

  it("normalizes a generic non-success password response", async () => {
    post.mockResolvedValue({ status: 503, data: {} });
    await expect(initiateAuthWithPassword("alice", "secret")).rejects.toMatchObject({
      code: "BAD_RESPONSE_STATUS",
      details: { status: 503 },
    });
  });

  it("normalizes a generic non-success refresh response", async () => {
    post.mockResolvedValue({ status: 418, data: {} });
    await expect(initiateAuthWithRefreshToken("refresh")).rejects.toMatchObject({
      code: "BAD_RESPONSE_STATUS",
      details: { status: 418 },
    });
  });

  it("normalizes provider transport errors", async () => {
    const failure = new Error("network down");
    post.mockRejectedValue(failure);
    await expect(initiateAuthWithPassword("alice", "secret")).rejects.toBe(failure);
    expect(createApiError).toHaveBeenCalledWith(failure);
  });

  it("performs global sign out with the dedicated Cognito target", async () => {
    post.mockResolvedValue({ status: 200, data: {} });
    await expect(globalSignOut("access-token")).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      "/",
      { AccessToken: "access-token" },
      { headers: { "X-Amz-Target": "AWSCognitoIdentityProviderService.GlobalSignOut" } }
    );
  });

  it("rejects global sign out without an access token", async () => {
    await expect(globalSignOut("")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(post).not.toHaveBeenCalled();
  });

  it("maps AWS-like global sign out failures", async () => {
    post.mockResolvedValue({ status: 400, data: { message: "Expired token" } });
    await expect(globalSignOut("access-token")).rejects.toMatchObject({
      code: "AWS_ERROR",
      message: "Global sign out failed.",
    });
  });

  it("normalizes generic global sign out failures", async () => {
    post.mockResolvedValue({ status: 500, data: {} });
    await expect(globalSignOut("access-token")).rejects.toMatchObject({
      code: "BAD_RESPONSE_STATUS",
      details: { status: 500 },
    });
  });
});
