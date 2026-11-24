import { type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/flows/categories -> GET {apiBaseUrl}/flows/categories */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, {
    method: "GET",
    path: "/flows/categories",
    forwardQuery: ["active", "is_active"],
  });
}

/** POST /api/flows/categories -> POST {apiBaseUrl}/flows/categories */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/flows/categories",
    expectJson: true,
  });
}
