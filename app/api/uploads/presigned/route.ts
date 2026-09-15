import { type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** POST /api/uploads/presigned -> POST {apiBaseUrl}/uploads/presigned */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/uploads/presigned",
    expectJson: true,
  });
}
