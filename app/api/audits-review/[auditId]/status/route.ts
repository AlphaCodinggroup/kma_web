import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ auditId: string }> };

/** PATCH /api/audits-review/:auditId/status */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;
  const id = pathSegment(auditId, "Audit id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, {
    method: "PATCH",
    path: `/audits-review/${id.value}/status`,
    expectJson: true,
  });
}
