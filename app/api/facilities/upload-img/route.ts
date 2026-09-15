import { NextResponse, type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** POST /api/facilities/upload-img -> POST {apiBaseUrl}/facilities/upload-img */
export async function POST(req: NextRequest) {
  let body: { filename?: string; content_type?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.filename || !body?.content_type) {
    return NextResponse.json(
      { message: "filename and content_type are required" },
      { status: 400 }
    );
  }

  return proxyToBackend(req, {
    method: "POST",
    path: "/facilities/upload-img",
    body,
  });
}
