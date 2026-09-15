import { type NextRequest } from "next/server";
import { proxyToBackend } from "@shared/api/backend-proxy";

/** POST /api/uploads -> POST {apiBaseUrl}/uploads */
export async function POST(req: NextRequest) {
  return proxyToBackend(req, {
    method: "POST",
    path: "/uploads",
    expectJson: true,
  });
}
