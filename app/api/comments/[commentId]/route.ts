import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

type RouteContext = { params: Promise<{ commentId: string }> };

/**
 * Proxy interno para actualizar un comentario de auditoría.
 * PATCH /api/comments/:commentId -> PATCH {apiBaseUrl}/comments/:commentId
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { commentId } = await params;

  if (!commentId) {
    return NextResponse.json(
      { message: "commentId is required" },
      { status: 400 }
    );
  }

  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const upstreamUrl = `${PublicEnv.apiBaseUrl.replace(
    /\/$/,
    ""
  )}/comments/${encodeURIComponent(commentId)}`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const responseBody = isJson
      ? await res.json().catch(() => ({}))
      : { message: await res.text() };

    return NextResponse.json(responseBody, { status: res.status });
  } catch (err) {
    console.error("[api/comments/:id] upstream PATCH error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
