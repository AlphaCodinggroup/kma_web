// ---------------------------------------------------------------------------------
// Cognito InitiateAuth (USER_PASSWORD_AUTH) implementation.
// - Server-side only: do not import from client components.
// - Reads ClientId from env; calls AWS Cognito with proper headers via cognitoHttp().
// - Returns a typed token bundle; throws ApiError on failure.
// ---------------------------------------------------------------------------------

import type { AxiosResponse } from "axios";
import { cognitoHttp } from "@shared/api/http.server";
import { serverEnv } from "@shared/config/env";
import {
  type ApiError,
  createApiError,
  createApiErrorFromAwsLike,
} from "@shared/interceptors/error";

// -----------------------------
// Tipos de DTO y Dominio
// -----------------------------

// Respuesta "cruda" de Cognito (DTO)
type CognitoInitiateAuthDTO = Readonly<{
  AuthenticationResult?: {
    AccessToken: string;
    ExpiresIn: number; // seconds
    IdToken: string;
    RefreshToken?: string;
    TokenType: "Bearer" | string;
  };
  ChallengeParameters?: Record<string, unknown>;
}>;

// Cuerpo de request a InitiateAuth
type CognitoInitiateAuthBody = Readonly<{
  AuthFlow: "USER_PASSWORD_AUTH";
  ClientId: string;
  AuthParameters: {
    USERNAME: string;
    PASSWORD: string;
  };
}>;

type CognitoInitiateAuthRefreshBody = Readonly<{
  AuthFlow: "REFRESH_TOKEN_AUTH";
  ClientId: string;
  AuthParameters: {
    REFRESH_TOKEN: string;
  };
}>;

type CognitoGlobalSignOutBody = Readonly<{
  AccessToken: string;
}>;

// Modelo de dominio que exponemos a capas superiores
export type AuthTokens = Readonly<{
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresInSeconds: number;
}>;

// -----------------------------
// Utilidades internas
// -----------------------------

/** Mapea el DTO de Cognito a nuestro modelo de dominio. */
function mapDtoToDomain(dto: CognitoInitiateAuthDTO): AuthTokens {
  const ar = dto.AuthenticationResult;
  if (!ar || !ar.AccessToken || !ar.IdToken || !ar.TokenType || !ar.ExpiresIn) {
    throw <ApiError>{
      code: "INVALID_PROVIDER_RESPONSE",
      message: "Authentication provider returned an unexpected payload.",
      details: { raw: dto },
    };
  }
  return {
    accessToken: ar.AccessToken,
    idToken: ar.IdToken,
    refreshToken: ar.RefreshToken ?? "",
    tokenType: ar.TokenType,
    expiresInSeconds: ar.ExpiresIn,
  };
}

/** Construye el body para InitiateAuth con USER_PASSWORD_AUTH. */
function buildInitiateAuthBody(
  username: string,
  password: string
): CognitoInitiateAuthBody {
  const env = serverEnv();
  return {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: env.cognito.clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };
}

/** Construye el body para InitiateAuth con REFRESH_TOKEN_AUTH. */
function buildRefreshBody(
  refreshToken: string
): CognitoInitiateAuthRefreshBody {
  const env = serverEnv();
  return {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: env.cognito.clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  };
}

/** Construye body para GlobalSignOut */
function buildGlobalSignOutBody(accessToken: string): CognitoGlobalSignOutBody {
  return { AccessToken: accessToken };
}

// -----------------------------
// API pública (server-side)
// -----------------------------

/**
 * Realiza InitiateAuth (USER_PASSWORD_AUTH) contra AWS Cognito.
 * @throws ApiError en cualquier fallo .
 */
export async function initiateAuthWithPassword(
  username: string,
  password: string
): Promise<AuthTokens> {
  try {
    if (!username || !password) {
      throw <ApiError>{
        code: "VALIDATION_ERROR",
        message: "Username and password are required.",
      };
    }

    const body = buildInitiateAuthBody(username, password);

    // Nota: cognitoHttp() ya incluye headers requeridos:
    // Content-Type: application/x-amz-json-1.1
    // X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth
    const http = cognitoHttp();

    const res: AxiosResponse<CognitoInitiateAuthDTO> = await http.post(
      "/",
      body
    );

    // Si por algún motivo pasara un 4xx/5xx sin throw, normalizamos acá.
    if (res.status < 200 || res.status >= 300) {
      const data = res.data as unknown as { __type?: string; message?: string };
      // Mapeo específico de AWS si viene __type/message (e.g., NotAuthorizedException)
      if (data && (data.__type || data.message)) {
        throw createApiErrorFromAwsLike(
          data,
          res.status,
          "Authentication failed."
        );
      }
      throw <ApiError>{
        code: "BAD_RESPONSE_STATUS",
        message: `Authentication failed with HTTP ${res.status}.`,
        details: { status: res.status, body: res.data },
      };
    }

    return mapDtoToDomain(res.data);
  } catch (err) {
    // Normalizamos SIEMPRE a ApiError para mantener contrato consistente
    const apiErr = createApiError(err);
    throw apiErr;
  }
}

/**
 * Realiza InitiateAuth (REFRESH_TOKEN_AUTH) contra AWS Cognito.
 * - Usa el refresh token para obtener un nuevo access token (y opcionalmente un nuevo refresh).
 * @throws ApiError en cualquier fallo (mensaje legible en inglés).
 */
export async function initiateAuthWithRefreshToken(
  refreshToken: string
): Promise<AuthTokens> {
  try {
    if (!refreshToken) {
      throw <ApiError>{
        code: "VALIDATION_ERROR",
        message: "Refresh token is required.",
      };
    }

    const body = buildRefreshBody(refreshToken);
    const http = cognitoHttp();

    const res: AxiosResponse<CognitoInitiateAuthDTO> = await http.post(
      "/",
      body
    );

    if (res.status < 200 || res.status >= 300) {
      const data = res.data as unknown as { __type?: string; message?: string };
      if (data && (data.__type || data.message)) {
        throw createApiErrorFromAwsLike(
          data,
          res.status,
          "Session refresh failed."
        );
      }
      throw <ApiError>{
        code: "BAD_RESPONSE_STATUS",
        message: `Session refresh failed with HTTP ${res.status}.`,
        details: { status: res.status, body: res.data },
      };
    }

    return mapDtoToDomain(res.data);
  } catch (err) {
    throw createApiError(err);
  }
}

/**
 * Ejecuta GlobalSignOut en Cognito invalidando todos los tokens del usuario.
 * Requiere AccessToken vigente.
 */
export async function globalSignOut(accessToken: string): Promise<void> {
  try {
    if (!accessToken) {
      throw <ApiError>{
        code: "VALIDATION_ERROR",
        message: "Access token is required for global sign out.",
      };
    }

    const body = buildGlobalSignOutBody(accessToken);
    const http = cognitoHttp();

    const res = await http.post("/", body, {
      headers: {
        "X-Amz-Target": "AWSCognitoIdentityProviderService.GlobalSignOut",
      },
    });

    if (res.status < 200 || res.status >= 300) {
      const data = res.data as unknown as { __type?: string; message?: string };
      if (data && (data.__type || data.message)) {
        throw createApiErrorFromAwsLike(
          data,
          res.status,
          "Global sign out failed."
        );
      }
      throw <ApiError>{
        code: "BAD_RESPONSE_STATUS",
        message: `Global sign out failed with HTTP ${res.status}.`,
        details: { status: res.status, body: res.data },
      };
    }
  } catch (err) {
    throw createApiError(err);
  }
}
