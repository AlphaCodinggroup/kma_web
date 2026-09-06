import type { NextRequest } from "next/server";
import { proxyBackend } from "@shared/api/backend-proxy";

export function POST(_request: NextRequest, context: { params: Promise<{ auditId: string }> }) {
  return context.params.then(({ auditId }) =>
    proxyBackend(`/reports/${encodeURIComponent(auditId)}/restore`, "POST")
  );
}
