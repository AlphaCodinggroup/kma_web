import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ auditId: string }> };

/** PUT /api/audits-review/:auditId/answers */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;
  const id = pathSegment(auditId, "Audit id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, {
    method: "PUT",
    path: `/audits-review/${id.value}/answers`,
    expectJson: true,
  });
}
