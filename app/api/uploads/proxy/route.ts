import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // por las dudas, para usar Buffer

export async function PUT(req: NextRequest) {
    const encodedUrl = req.nextUrl.searchParams.get("url");
    const targetUrl = encodedUrl
        ? Buffer.from(encodedUrl, "base64").toString("utf8")
        : null;

    if (!targetUrl) {
        return NextResponse.json({ message: "Missing url" }, { status: 400 });
    }

    try {
        const contentType =
            req.headers.get("content-type") ?? "application/octet-stream";

        const bodyArrayBuffer = await req.arrayBuffer();
        const body = Buffer.from(bodyArrayBuffer);
        const contentLength = String(body.byteLength);

        const res = await fetch(targetUrl, {
            method: "PUT",
            body,
            headers: {
                "Content-Type": contentType,
                "Content-Length": contentLength,
            },
            cache: "no-store",
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("[api/uploads/proxy] S3 error:", res.status, text);
            return NextResponse.json(
                { message: "Failed to upload to S3", details: text },
                { status: res.status }
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("[api/uploads/proxy] Proxy error:", err);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}