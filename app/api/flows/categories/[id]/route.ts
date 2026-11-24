import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/flows/categories/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const categoryId = pathSegment(id, "Category id");
  if (!categoryId.ok) return categoryId.response;

  return proxyToBackend(req, {
    method: "GET",
    path: `/flows/categories/${categoryId.value}`,
  });
}

/** PUT /api/flows/categories/:id */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const categoryId = pathSegment(id, "Category id");
  if (!categoryId.ok) return categoryId.response;

  return proxyToBackend(req, {
    method: "PUT",
    path: `/flows/categories/${categoryId.value}`,
    expectJson: true,
  });
}

/** DELETE /api/flows/categories/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const categoryId = pathSegment(id, "Category id");
  if (!categoryId.ok) return categoryId.response;

  return proxyToBackend(req, {
    method: "DELETE",
    path: `/flows/categories/${categoryId.value}`,
    forwardQuery: ["permanent"],
  });
}
