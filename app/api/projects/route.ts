import { type NextRequest } from "next/server";
import { LIST_LIMIT_MAX, proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/projects -> GET {apiBaseUrl}/projects */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  return proxyToBackend(req, {
    method: "GET",
    path: "/projects",
    forwardQuery: ["limit", "cursor", "status", "search"],
    // El backend espera snake_case.
    query: {
      sort_by: searchParams.get("sortBy"),
      sort_order: searchParams.get("sortOrder"),
    },
    numericQuery: { limit: LIST_LIMIT_MAX },
  });
}

/** POST /api/projects -> POST {apiBaseUrl}/projects */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/projects",
    expectJson: true,
  });
}
