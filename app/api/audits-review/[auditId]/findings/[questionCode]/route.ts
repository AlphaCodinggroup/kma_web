import { type NextRequest } from "next/server";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

type RouteContext = {
  params: Promise<{ auditId: string; questionCode: string }>;
};

/** PATCH /api/audits-review/:auditId/findings/:questionCode */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { auditId, questionCode } = await params;
  const id = pathSegment(auditId, "Audit id");
  if (!id.ok) return id.response;
  const code = pathSegment(questionCode, "Question code");
  if (!code.ok) return code.response;

  return proxyToBackend(req, {
    method: "PATCH",
    path: `/audits-review/${id.value}/findings/${code.value}`,
    expectJson: true,
  });
}
