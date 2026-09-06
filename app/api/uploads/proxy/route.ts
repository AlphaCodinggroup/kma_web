import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverEnv } from "@shared/config/env";
import { verifyAccessToken } from "@shared/auth/verify-access-token";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  const env = serverEnv();
  const { cookies: cookieCfg } = env;
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieCfg.accessName)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const encodedUrl = req.nextUrl.searchParams.get("url");
  let targetUrl: URL | null = null;
  try {
    targetUrl = encodedUrl
      ? new URL(Buffer.from(encodedUrl, "base64").toString("utf8"))
      : null;
  } catch {
    return NextResponse.json({ message: "Invalid upload URL" }, { status: 400 });
  }

  if (!targetUrl) {
    return NextResponse.json({ message: "Missing url" }, { status: 400 });
  }
  try {
    await verifyAccessToken(token, ["admin", "administrator", "auditor"]);
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "Forbidden";
    return NextResponse.json(
      { message: forbidden ? "Forbidden" : "Unauthorized" },
      { status: forbidden ? 403 : 401 }
    );
  }
  if (
    !["http:", "https:"].includes(targetUrl.protocol) ||
    targetUrl.username ||
    targetUrl.password ||
    targetUrl.hash
  ) {
    return NextResponse.json(
      { message: "Invalid upload destination" },
      { status: 400 }
    );
  }
  const hostname = targetUrl.hostname.toLowerCase();
  if (!env.uploads.allowedHosts.includes(hostname)) {
    return NextResponse.json(
      { message: "Upload destination is not allowed" },
      { status: 403 }
    );
  }
  const pathBucket = targetUrl.pathname
    .split("/")
    .filter(Boolean)[0]
    ?.toLowerCase();
  const virtualBucket = hostname.includes(".s3.")
    ? hostname.split(".s3.")[0]
    : undefined;
  if (
    !env.uploads.allowedBuckets.includes(pathBucket ?? "") &&
    !env.uploads.allowedBuckets.includes(virtualBucket ?? "")
  ) {
    return NextResponse.json(
      { message: "Upload bucket is not allowed" },
      { status: 403 }
    );
  }

  try {
    const contentType =
      req.headers.get("content-type") ?? "application/octet-stream";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType.toLowerCase())) {
      return NextResponse.json(
        { message: "Unsupported upload content type" },
        { status: 415 }
      );
    }
    const declaredLength = Number(req.headers.get("content-length") ?? "0");
    if (
      !Number.isFinite(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > env.uploads.maxBytes
    ) {
      return NextResponse.json(
        { message: "Upload is too large" },
        { status: 413 }
      );
    }

    const bodyArrayBuffer = await req.arrayBuffer();
    const body = Buffer.from(bodyArrayBuffer);
    if (body.byteLength > env.uploads.maxBytes) {
      return NextResponse.json(
        { message: "Upload is too large" },
        { status: 413 }
      );
    }
    const contentLength = String(body.byteLength);

    const res = await fetch(targetUrl, {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength,
      },
      cache: "no-store",
      redirect: "error",
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
