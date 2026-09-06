import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { serverEnv } from "@shared/config/env";

export interface VerifiedAccessClaims extends JWTPayload {
  token_use?: string;
  client_id?: string;
  "cognito:groups"?: string[];
}

export async function verifyAccessToken(token: string, allowedGroups?: string[]) {
  const { cognito } = serverEnv();
  if (!cognito.jwksUrl || !cognito.issuer) throw new Error("JWT verification is not configured");
  const { payload } = await jwtVerify<VerifiedAccessClaims>(
    token,
    createRemoteJWKSet(new URL(cognito.jwksUrl)),
    { issuer: cognito.issuer, algorithms: ["RS256"], requiredClaims: ["sub", "exp", "iat"] }
  );
  if (payload.token_use !== "access" || payload.client_id !== cognito.clientId) {
    throw new Error("Invalid access token purpose or client");
  }
  if (allowedGroups?.length) {
    const groups = Array.isArray(payload["cognito:groups"]) ? payload["cognito:groups"] : [];
    if (!allowedGroups.some((allowed) => groups.some((group) => group.toLowerCase() === allowed.toLowerCase()))) {
      throw new Error("Forbidden");
    }
  }
  return payload;
}
