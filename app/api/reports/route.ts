import { NextRequest } from "next/server";
import { proxyBackend } from "@shared/api/backend-proxy";

const FORWARDED_QUERY_PARAMETERS = [
  "project_id",
  "user_id",
  "status",
  "limit",
  "last_eval_id",
  "sort_by",
  "sort_order",
  "include_archived",
] as const;

export async function GET(req: NextRequest) {
  const query = new URLSearchParams();
  for (const parameter of FORWARDED_QUERY_PARAMETERS) {
    const value = req.nextUrl.searchParams.get(parameter);
    if (value !== null && value !== "") query.set(parameter, value);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return proxyBackend(`/reports${suffix}`, "GET");
}
