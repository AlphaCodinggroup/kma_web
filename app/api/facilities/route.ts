import { type NextRequest } from "next/server";
import { LIST_LIMIT_MAX, proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/facilities -> GET {apiBaseUrl}/facilities */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");

  return proxyToBackend(req, {
    method: "GET",
    path: "/facilities",
    forwardQuery: ["limit", "cursor", "status", "search"],
    // El backend espera snake_case.
    query: { project_id: projectId },
    numericQuery: { limit: LIST_LIMIT_MAX },
  });
}

/** POST /api/facilities -> POST {apiBaseUrl}/facilities */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/facilities",
    expectJson: true,
  });
}
