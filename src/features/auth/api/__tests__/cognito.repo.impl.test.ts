/**
 * El repo de Cognito es server-side (usa cognitoHttp y serverEnv).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { postMock, cognitoHttpMock } = vi.hoisted(() => {
  const postMock = vi.fn();
  return {
    postMock,
    cognitoHttpMock: vi.fn(() => ({ post: postMock })),
  };
});

vi.mock("@shared/api/http.server", () => ({
  cognitoHttp: cognitoHttpMock,
  serverHttp: vi.fn(),
  createServerHttp: vi.fn(),
}));

import {
  initiateAuthWithPassword,
  initiateAuthWithRefreshToken,
  globalSignOut,
} from "../cognito.repo.impl";

/** Variables de servidor mínimas que exige serverEnv(). */
function stubEnv() {
  const vars: Record<string, string> = {
    NEXT_PUBLIC_APP_NAME: "KMA",
    NEXT_PUBLIC_APP_ENV: "development",
    NEXT_PUBLIC_AUTH_BASE_URL: "https://cognito-idp.us-east-2.amazonaws.com",
    NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
    NEXT_PUBLIC_HTTP_TIMEOUT_MS: "5000",
    NEXT_PUBLIC_QUERY_STALE_TIME: "30000",
    COGNITO_REGION: "us-east-2",
    COGNITO_CLIENT_ID: "client-123",
    SESSION_COOKIE_NAME: "kma_session",
    ACCESS_TOKEN_COOKIE_NAME: "kma_access",
    REFRESH_TOKEN_COOKIE_NAME: "kma_refresh",
    COOKIE_SECURE: "false",
    COOKIE_SAMESITE: "Lax",
    HTTP_RETRY_MAX_ATTEMPTS: "2",
    HTTP_RETRY_BASE_DELAY_MS: "1",
  };
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}

/** Respuesta OK de InitiateAuth. */
function authResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: 200,
    data: {
      AuthenticationResult: {
        AccessToken: "access-token",
        IdToken: "id-token",
        RefreshToken: "refresh-token",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      },
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  cognitoHttpMock.mockReturnValue({ post: postMock });
  stubEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// initiateAuthWithPassword
// ---------------------------------------------------------------------------

describe("initiateAuthWithPassword", () => {
  it("posts the USER_PASSWORD_AUTH body to the Cognito root path", async () => {
    postMock.mockResolvedValueOnce(authResponse());

    await initiateAuthWithPassword("ada@example.com", "S3cret!");

    expect(postMock).toHaveBeenCalledWith("/", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: "client-123",
      AuthParameters: {
        USERNAME: "ada@example.com",
        PASSWORD: "S3cret!",
      },
    });
  });

  it("maps the provider payload into the domain token bundle", async () => {
    postMock.mockResolvedValueOnce(authResponse());

    const tokens = await initiateAuthWithPassword("ada", "pwd");

    expect(tokens).toEqual({
      accessToken: "access-token",
      idToken: "id-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
    });
  });

  it("defaults the refresh token to an empty string when absent", async () => {
    postMock.mockResolvedValueOnce({
      status: 200,
      data: {
        AuthenticationResult: {
          AccessToken: "a",
          IdToken: "i",
          TokenType: "Bearer",
          ExpiresIn: 60,
        },
      },
    });

    const tokens = await initiateAuthWithPassword("ada", "pwd");

    expect(tokens.refreshToken).toBe("");
  });

  it.each([
    ["an empty username", "", "pwd"],
    ["an empty password", "ada", ""],
    ["both empty", "", ""],
  ])("rejects with VALIDATION_ERROR for %s", async (_label, user, pass) => {
    await expect(initiateAuthWithPassword(user, pass)).rejects.toEqual({
      code: "VALIDATION_ERROR",
      message: "Username and password are required.",
    });
    expect(postMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      "an AWS __type payload",
      { __type: "NotAuthorizedException", message: "Incorrect username or password." },
      "NotAuthorizedException",
      "Incorrect username or password.",
    ],
    [
      "a namespaced AWS __type payload",
      {
        __type: "com.amazonaws.cognito.identity.idp.model#UserNotFoundException",
        message: "User does not exist.",
      },
      "UserNotFoundException",
      "User does not exist.",
    ],
    [
      "a payload with only a message",
      { message: "Something went wrong." },
      "BAD_REQUEST",
      "Something went wrong.",
    ],
  ])(
    "maps a 4xx response carrying %s",
    async (_label, data, expectedCode, expectedMessage) => {
      postMock.mockResolvedValueOnce({ status: 400, data });

      await expect(initiateAuthWithPassword("ada", "pwd")).rejects.toMatchObject(
        { code: expectedCode, message: expectedMessage }
      );
    }
  );

  it("falls back to BAD_RESPONSE_STATUS for a body without AWS hints", async () => {
    postMock.mockResolvedValueOnce({ status: 500, data: {} });

    await expect(initiateAuthWithPassword("ada", "pwd")).rejects.toEqual({
      code: "BAD_RESPONSE_STATUS",
      message: "Authentication failed with HTTP 500.",
      details: { status: 500, body: {} },
    });
  });

  it.each([
    ["an empty payload", {}],
    ["a missing AccessToken", { AuthenticationResult: { IdToken: "i", TokenType: "Bearer", ExpiresIn: 1 } }],
    ["a missing IdToken", { AuthenticationResult: { AccessToken: "a", TokenType: "Bearer", ExpiresIn: 1 } }],
    ["a missing TokenType", { AuthenticationResult: { AccessToken: "a", IdToken: "i", ExpiresIn: 1 } }],
    ["a missing ExpiresIn", { AuthenticationResult: { AccessToken: "a", IdToken: "i", TokenType: "Bearer" } }],
  ])("rejects with INVALID_PROVIDER_RESPONSE for %s", async (_label, data) => {
    postMock.mockResolvedValueOnce({ status: 200, data });

    await expect(initiateAuthWithPassword("ada", "pwd")).rejects.toMatchObject({
      code: "INVALID_PROVIDER_RESPONSE",
    });
  });

  it("normalises a transport failure into an ApiError", async () => {
    postMock.mockRejectedValueOnce(new Error("socket hang up"));

    await expect(initiateAuthWithPassword("ada", "pwd")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "socket hang up",
    });
  });
});

// ---------------------------------------------------------------------------
// initiateAuthWithRefreshToken
// ---------------------------------------------------------------------------

describe("initiateAuthWithRefreshToken", () => {
  it("posts the REFRESH_TOKEN_AUTH body", async () => {
    postMock.mockResolvedValueOnce(authResponse());

    await initiateAuthWithRefreshToken("refresh-abc");

    expect(postMock).toHaveBeenCalledWith("/", {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: "client-123",
      AuthParameters: { REFRESH_TOKEN: "refresh-abc" },
    });
  });

  it("maps the refreshed tokens into the domain bundle", async () => {
    postMock.mockResolvedValueOnce(authResponse());

    const tokens = await initiateAuthWithRefreshToken("refresh-abc");

    expect(tokens.accessToken).toBe("access-token");
    expect(tokens.expiresInSeconds).toBe(3600);
  });

  it("rejects with VALIDATION_ERROR for an empty refresh token", async () => {
    await expect(initiateAuthWithRefreshToken("")).rejects.toEqual({
      code: "VALIDATION_ERROR",
      message: "Refresh token is required.",
    });
    expect(postMock).not.toHaveBeenCalled();
  });

  it("maps an AWS error payload on a non-2xx response", async () => {
    postMock.mockResolvedValueOnce({
      status: 400,
      data: { __type: "NotAuthorizedException", message: "Refresh Token has expired." },
    });

    await expect(
      initiateAuthWithRefreshToken("refresh-abc")
    ).rejects.toMatchObject({
      code: "NotAuthorizedException",
      message: "Refresh Token has expired.",
    });
  });

  it("falls back to BAD_RESPONSE_STATUS without AWS hints", async () => {
    postMock.mockResolvedValueOnce({ status: 503, data: {} });

    await expect(initiateAuthWithRefreshToken("refresh-abc")).rejects.toEqual({
      code: "BAD_RESPONSE_STATUS",
      message: "Session refresh failed with HTTP 503.",
      details: { status: 503, body: {} },
    });
  });

  it("rejects with INVALID_PROVIDER_RESPONSE for an unexpected payload", async () => {
    postMock.mockResolvedValueOnce({ status: 200, data: {} });

    await expect(
      initiateAuthWithRefreshToken("refresh-abc")
    ).rejects.toMatchObject({ code: "INVALID_PROVIDER_RESPONSE" });
  });
});

// ---------------------------------------------------------------------------
// globalSignOut
// ---------------------------------------------------------------------------

describe("globalSignOut", () => {
  it("posts the access token overriding the X-Amz-Target header", async () => {
    postMock.mockResolvedValueOnce({ status: 200, data: {} });

    await expect(globalSignOut("access-abc")).resolves.toBeUndefined();

    expect(postMock).toHaveBeenCalledWith(
      "/",
      { AccessToken: "access-abc" },
      {
        headers: {
          "X-Amz-Target": "AWSCognitoIdentityProviderService.GlobalSignOut",
        },
      }
    );
  });

  it("rejects with VALIDATION_ERROR for an empty access token", async () => {
    await expect(globalSignOut("")).rejects.toEqual({
      code: "VALIDATION_ERROR",
      message: "Access token is required for global sign out.",
    });
    expect(postMock).not.toHaveBeenCalled();
  });

  it("maps an AWS error payload on a non-2xx response", async () => {
    postMock.mockResolvedValueOnce({
      status: 400,
      data: { __type: "NotAuthorizedException", message: "Access Token has been revoked" },
    });

    await expect(globalSignOut("access-abc")).rejects.toMatchObject({
      code: "NotAuthorizedException",
      message: "Access Token has been revoked",
    });
  });

  it("falls back to BAD_RESPONSE_STATUS without AWS hints", async () => {
    postMock.mockResolvedValueOnce({ status: 500, data: {} });

    await expect(globalSignOut("access-abc")).rejects.toEqual({
      code: "BAD_RESPONSE_STATUS",
      message: "Global sign out failed with HTTP 500.",
      details: { status: 500, body: {} },
    });
  });

  it("normalises a transport failure", async () => {
    postMock.mockRejectedValueOnce(new Error("network down"));

    await expect(globalSignOut("access-abc")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "network down",
    });
  });
});
