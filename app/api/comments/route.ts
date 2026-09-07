import { NextResponse, type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** POST /api/comments -> POST {apiBaseUrl}/comments */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/comments",
    expectJson: true,
  });
}

/** GET /api/comments?audit_id=... -> GET {apiBaseUrl}/comments?audit_id=... */
export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("audit_id");
  if (!auditId) {
    return NextResponse.json(
      { message: "audit_id is required" },
      { status: 400 }
    );
  }

  return proxyToBackend(req, {
    method: "GET",
    path: "/comments",
    query: { audit_id: auditId },
  });
}
