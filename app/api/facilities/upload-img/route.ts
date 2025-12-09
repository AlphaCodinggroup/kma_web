import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

export async function POST(req: Request) {
  const { cookies: cookieCfg } = serverEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { filename?: string; content_type?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.filename || !body?.content_type) {
    return NextResponse.json(
      { message: "filename and content_type are required" },
      { status: 400 }
    );
  }

  const upstreamUrl = `${PublicEnv.apiBaseUrl}/facilities/upload-img`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      if (contentType.includes("application/json")) {
        const errorBody = await res.json();
        return NextResponse.json(errorBody, { status: res.status });
      }

      const text = await res.text();
      return NextResponse.json(
        { message: text || "Upstream error" },
        { status: res.status }
      );
    }

    const data = contentType.includes("application/json")
      ? await res.json()
      : null;

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[api/facilities/upload-img] upstream POST error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
