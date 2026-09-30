import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ auditReviewId: string }> };

/** GET /api/audits/audit-reviews/:id -> GET {apiBaseUrl}/audits-review/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { auditReviewId } = await params;
  const id = pathSegment(auditReviewId, "Audit review id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, {
    method: "GET",
    path: `/audits-review/${id.value}`,
  });
}
