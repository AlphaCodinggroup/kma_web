import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
    const { cookies: cookieCfg } = serverEnv();
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieCfg.accessName)?.value;

    if (!token) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    if (!userId) {
        return NextResponse.json(
            { message: "User id is required" },
            { status: 400 }
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const upstreamUrl = `${PublicEnv.apiBaseUrl}/users/${encodeURIComponent(
        userId
    )}`;

    try {
        const res = await fetch(upstreamUrl, {
            method: "PUT",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
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

        if (res.status === 204 || !contentType.includes("application/json")) {
            return new NextResponse(null, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error("[api/users/:id] upstream PATCH error:", err);
        return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    const { cookies: cookieCfg } = serverEnv();
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieCfg.accessName)?.value;

    if (!token) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    if (!userId) {
        return NextResponse.json(
            { message: "User id is required" },
            { status: 400 }
        );
    }

    const upstreamUrl = `${PublicEnv.apiBaseUrl}/users/${encodeURIComponent(
        userId
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

        if (res.status === 204 || !contentType.includes("application/json")) {
            return new NextResponse(null, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error("[api/users/:id] upstream DELETE error:", err);
        return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
    }
}
