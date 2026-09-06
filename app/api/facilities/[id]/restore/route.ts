import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PublicEnv, serverEnv } from "@shared/config/env";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { cookies: cookieCfg } = serverEnv();
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieCfg.accessName)?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const response = await fetch(`${PublicEnv.apiBaseUrl.replace(/\/$/, "")}/facilities/${encodeURIComponent(id)}/restore`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: errorText || "Failed to restore facility" },
                { status: response.status }
            );
        }

        const contentType = response.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
            ? await response.json().catch(() => ({}))
            : { message: await response.text() };
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Error restoring facility:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
