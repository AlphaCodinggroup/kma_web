import { NextRequest, NextResponse } from "next/server";
import { apiRouteRoles, groupCanAccess } from "@shared/auth/api-route-policy";
import { verifyAccessToken } from "@shared/auth/verify-access-token";
import { serverEnv } from "@shared/config/env";

export async function middleware(request: NextRequest) {
  const allowed = apiRouteRoles(request.method, request.nextUrl.pathname);
  if (allowed === null) return NextResponse.next();

  const token = request.cookies.get(serverEnv().cookies.accessName)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const claims = await verifyAccessToken(token);
    const groups = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [];
    if (!groupCanAccess(groups, allowed)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export const config = { matcher: ["/api/:path*"] };
