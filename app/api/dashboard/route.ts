import { type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/dashboard -> GET {apiBaseUrl}/dashboard */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, { method: "GET", path: "/dashboard" });
}
