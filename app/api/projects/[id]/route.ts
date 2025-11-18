import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json(
      { message: "Project id is required" },
      { status: 400 }
    );
  }

  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const upstreamUrl = `${PublicEnv.apiBaseUrl}/projects/${encodeURIComponent(
    id
  )}`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";

    if (res.ok) return new NextResponse(null, { status: 204 });

    if (res.status === 401)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    if (contentType.includes("application/json")) {
      const body = await res.json();
      return NextResponse.json(body, { status: res.status });
    }

    const text = await res.text();
    return NextResponse.json(
      { message: text || "Upstream error" },
      { status: res.status }
    );
  } catch (err) {
    console.error("[api/projects/[id]] upstream error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
