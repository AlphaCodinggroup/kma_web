import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/facilities/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const facilityId = pathSegment(id, "Facility id");
  if (!facilityId.ok) return facilityId.response;

  return proxyToBackend(req, {
    method: "GET",
    path: `/facilities/${facilityId.value}`,
  });
}

/** PUT /api/facilities/:id */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const facilityId = pathSegment(id, "Facility id");
  if (!facilityId.ok) return facilityId.response;

  return proxyToBackend(req, {
    method: "PUT",
    path: `/facilities/${facilityId.value}`,
    expectJson: true,
  });
}

/** DELETE /api/facilities/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const facilityId = pathSegment(id, "Facility id");
  if (!facilityId.ok) return facilityId.response;

  return proxyToBackend(req, {
    method: "DELETE",
    path: `/facilities/${facilityId.value}`,
  });
}
