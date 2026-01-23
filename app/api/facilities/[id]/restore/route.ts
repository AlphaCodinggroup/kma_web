import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!BACKEND_URL) {
        return NextResponse.json(
            { error: "Backend URL not configured" },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(`${BACKEND_URL}/facilities/${id}/restore`, {
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

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error restoring facility:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
