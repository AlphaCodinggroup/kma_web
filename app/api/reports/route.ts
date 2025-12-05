import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

export async function GET(req: NextRequest) {
  const { cookies: cookieCfg } = serverEnv();

  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upstreamBase = PublicEnv.apiBaseUrl.replace(/\/$/, "");
  const upstreamUrl = new URL(`${upstreamBase}/reports`);

  const searchParams = req.nextUrl.searchParams;

  const projectId = searchParams.get("project_id");
  const userId = searchParams.get("user_id");
  const status = searchParams.get("status");
  const limit = searchParams.get("limit");
  const lastEvalId = searchParams.get("last_eval_id");

  if (projectId) upstreamUrl.searchParams.set("project_id", projectId);
  if (userId) upstreamUrl.searchParams.set("user_id", userId);
  if (status) upstreamUrl.searchParams.set("status", status);
  if (limit) upstreamUrl.searchParams.set("limit", limit);
  if (lastEvalId) upstreamUrl.searchParams.set("last_eval_id", lastEvalId);

  try {
    const res = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      const body = isJson
        ? await res.json().catch(() => ({}))
        : { message: await res.text() };
      return NextResponse.json(body, { status: res.status });
    }

    const data = isJson ? await res.json().catch(() => ({})) : {};
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[api/reports:list] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
