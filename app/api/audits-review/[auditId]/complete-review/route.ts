import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ auditId: string }> };

/** POST /api/audits-review/:auditId/complete-review */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;
  const id = pathSegment(auditId, "Audit id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, {
    method: "POST",
    path: `/audits-review/${id.value}/complete-review`,
    omitBody: true,
  });
}
