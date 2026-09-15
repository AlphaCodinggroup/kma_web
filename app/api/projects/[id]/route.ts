import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/projects/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const projectId = pathSegment(id, "Project id");
  if (!projectId.ok) return projectId.response;

  return proxyToBackend(req, {
    method: "GET",
    path: `/projects/${projectId.value}`,
  });
}

/** PATCH /api/projects/:id */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const projectId = pathSegment(id, "Project id");
  if (!projectId.ok) return projectId.response;

  return proxyToBackend(req, {
    method: "PATCH",
    path: `/projects/${projectId.value}`,
    expectJson: true,
  });
}

/** DELETE /api/projects/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const projectId = pathSegment(id, "Project id");
  if (!projectId.ok) return projectId.response;

  return proxyToBackend(req, {
    method: "DELETE",
    path: `/projects/${projectId.value}`,
  });
}
