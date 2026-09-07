import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ auditId: string }> };

/** GET /api/reports/:auditId -> GET {apiBaseUrl}/reports/:auditId */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;
  const id = pathSegment(auditId, "Report id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, { method: "GET", path: `/reports/${id.value}` });
}

/** DELETE /api/reports/:auditId -> DELETE {apiBaseUrl}/reports/:auditId */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;
  const id = pathSegment(auditId, "Report id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, {
    method: "DELETE",
    path: `/reports/${id.value}`,
  });
}
