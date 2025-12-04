import { NextResponse } from "next/server";

export async function PUT(req: Request) {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
        return NextResponse.json(
            { message: "Missing 'url' query parameter" },
            { status: 400 }
        );
    }

    try {
        // Forward the request body (file stream) directly to S3
        // We preserve the Content-Type header from the client request
        const contentType = req.headers.get("content-type") || "application/octet-stream";

        const res = await fetch(targetUrl, {
            method: "PUT",
            body: req.body,
            headers: {
                "Content-Type": contentType,
            },
            // Important: prevent Next.js from parsing the body or caching
            // @ts-ignore - duplex is needed for streaming bodies in node fetch
            duplex: "half",
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
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return PUT(req);
}
