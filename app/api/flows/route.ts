import { type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/flows -> GET {apiBaseUrl}/flows */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, { method: "GET", path: "/flows" });
}

/** POST /api/flows -> POST {apiBaseUrl}/flows */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/flows",
    expectJson: true,
  });
}
