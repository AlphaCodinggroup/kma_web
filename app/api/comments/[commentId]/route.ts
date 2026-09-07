import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ commentId: string }> };

/** PUT /api/comments/:commentId -> PUT {apiBaseUrl}/comments/:commentId */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { commentId } = await params;
  const id = pathSegment(commentId, "Comment id");
  if (!id.ok) return id.response;

  return proxyToBackend(req, {
    method: "PUT",
    path: `/comments/${id.value}`,
    expectJson: true,
  });
}
