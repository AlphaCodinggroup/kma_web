import { NextResponse, type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "Facility id is required" },
      { status: 400 }
    );
  }

  return proxyToBackend(req, {
    method: "POST",
    path: `/facilities/${id}/restore`,
    omitBody: true,
  });
}
