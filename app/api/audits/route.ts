import { type NextRequest } from "next/server";
import { LIST_LIMIT_MAX, proxyToBackend } from "@shared/api/backend-proxy";

/** GET /api/audits -> GET {apiBaseUrl}/audits */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, {
    method: "GET",
    path: "/audits",
    forwardQuery: ["status", "auditor", "limit", "last_eval_id"],
    numericQuery: { limit: LIST_LIMIT_MAX },
  });
}
