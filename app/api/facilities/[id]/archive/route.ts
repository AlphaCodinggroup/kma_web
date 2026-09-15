import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/facilities/:id/archive */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const facilityId = pathSegment(id, "Facility id");
  if (!facilityId.ok) return facilityId.response;

  return proxyToBackend(req, {
    method: "POST",
    path: `/facilities/${facilityId.value}/archive`,
    omitBody: true,
  });
}
