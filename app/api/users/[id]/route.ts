import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/users/:id -> PUT {apiBaseUrl}/users/:id
 *
 * El backend expone PUT; la UI manda sólo los campos que cambian, así que el
 * handler es PATCH hacia afuera y traduce el método hacia el backend.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const userId = pathSegment(id, "User id");
  if (!userId.ok) return userId.response;

  return proxyToBackend(req, {
    method: "PUT",
    path: `/users/${userId.value}`,
    expectJson: true,
  });
}

/** DELETE /api/users/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const userId = pathSegment(id, "User id");
  if (!userId.ok) return userId.response;

  return proxyToBackend(req, {
    method: "DELETE",
    path: `/users/${userId.value}`,
  });
}
