import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/flows/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const flowId = pathSegment(id, "Flow id");
  if (!flowId.ok) return flowId.response;

  return proxyToBackend(req, { method: "GET", path: `/flows/${flowId.value}` });
}

/** PUT /api/flows/:id */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const flowId = pathSegment(id, "Flow id");
  if (!flowId.ok) return flowId.response;

  return proxyToBackend(req, {
    method: "PUT",
    path: `/flows/${flowId.value}`,
    expectJson: true,
  });
}

/** DELETE /api/flows/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const flowId = pathSegment(id, "Flow id");
  if (!flowId.ok) return flowId.response;

  return proxyToBackend(req, {
    method: "DELETE",
    path: `/flows/${flowId.value}`,
  });
}
