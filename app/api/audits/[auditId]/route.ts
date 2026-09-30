import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ auditId: string }> };

/** GET /api/audits/:auditId -> GET {apiBaseUrl}/audits/:auditId */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;
  const id = pathSegment(auditId, "Audit id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, { method: "GET", path: `/audits/${id.value}` });
}

/** DELETE /api/audits/:auditId -> DELETE {apiBaseUrl}/audits/:auditId */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { auditId } = await params;
  const id = pathSegment(auditId, "Audit id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, { method: "DELETE", path: `/audits/${id.value}` });
}
