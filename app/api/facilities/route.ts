import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

export async function GET(req: NextRequest) {
  const { cookies: cookieCfg } = serverEnv();

  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upstreamUrl = new URL(`${PublicEnv.apiBaseUrl}/facilities`);

  const searchParams = req.nextUrl.searchParams;

  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const projectId = searchParams.get("projectId");

  if (limit) upstreamUrl.searchParams.set("limit", limit);
  if (cursor) upstreamUrl.searchParams.set("cursor", cursor);
  if (status) upstreamUrl.searchParams.set("status", status);
  if (search) upstreamUrl.searchParams.set("search", search);

  // Convención: el backend espera `project_id` en snake_case
  if (projectId) upstreamUrl.searchParams.set("project_id", projectId);

  try {
    const res = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      if (contentType.includes("application/json")) {
        const body = await res.json();
        return NextResponse.json(body, { status: res.status });
      }

      const text = await res.text();
      return NextResponse.json(
        { message: text || "Upstream error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[api/facilities] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
