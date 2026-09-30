import { type NextRequest } from "next/server";
import { LIST_LIMIT_MAX, proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/reports -> GET {apiBaseUrl}/reports */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, {
    method: "GET",
    path: "/reports",
    forwardQuery: [
      "project_id",
      "user_id",
      "status",
      "limit",
      "last_eval_id",
    ],
    numericQuery: { limit: LIST_LIMIT_MAX },
  });
}
