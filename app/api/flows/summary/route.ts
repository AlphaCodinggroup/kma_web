import { type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/flows/summary -> GET {apiBaseUrl}/flows/summary */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, { method: "GET", path: "/flows/summary" });
}
