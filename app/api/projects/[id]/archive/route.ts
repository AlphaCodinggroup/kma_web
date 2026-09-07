import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/projects/:id/archive */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const projectId = pathSegment(id, "Project id");
  if (!projectId.ok) return projectId.response;

  return proxyToBackend(req, {
    method: "POST",
    path: `/projects/${projectId.value}/archive`,
    omitBody: true,
  });
}
