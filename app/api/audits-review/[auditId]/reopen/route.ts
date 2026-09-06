import { NextResponse, type NextRequest } from "next/server";
import { proxyBackend } from "@shared/api/backend-proxy";

export async function POST(request: NextRequest, context: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyBackend(`/audits-review/${encodeURIComponent(auditId)}/reopen`, "POST", body);
}
