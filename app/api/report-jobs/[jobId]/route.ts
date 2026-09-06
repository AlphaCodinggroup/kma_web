import type { NextRequest } from "next/server";
import { proxyBackend } from "@shared/api/backend-proxy";

export function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  return context.params.then(({ jobId }) =>
    proxyBackend(`/report-jobs/${encodeURIComponent(jobId)}`, "GET")
  );
}
