import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { cookies: cookieCfg } = serverEnv();

  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const facilityId = id;

  if (!facilityId) {
    return NextResponse.json(
      { message: "Facility id is required" },
      { status: 400 }
    );
  }

  const upstreamUrl = `${PublicEnv.apiBaseUrl}/facilities/${facilityId}/archive`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "POST",
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
        const errorBody = await res.json();
        return NextResponse.json(errorBody, { status: res.status });
      }

      const text = await res.text();
      return NextResponse.json(
        { message: text || "Upstream error" },
        { status: res.status }
      );
    }

    // Esperamos que el backend devuelva la facility actualizada en JSON
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // Si no viene JSON pero es OK, devolvemos 200 sin body estructurado
    return NextResponse.json(null, { status: res.status });
  } catch (err) {
    console.error("[api/facilities/:id/archive] upstream POST error:", err);
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}
