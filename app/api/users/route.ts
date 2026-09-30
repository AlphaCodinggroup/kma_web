import { type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/users -> GET {apiBaseUrl}/users */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, {
    method: "GET",
    path: "/users",
    forwardQuery: ["role"],
  });
}

/** POST /api/users -> POST {apiBaseUrl}/users */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/users",
    expectJson: true,
  });
}
