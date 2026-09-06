import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PublicEnv, serverEnv } from "@shared/config/env";

export async function proxyBackend(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
) {
  const env = serverEnv();
  const token = (await cookies()).get(env.cookies.accessName)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
	const init: RequestInit = {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      cache: "no-store",
      redirect: "error",
	};
	if (body !== undefined) init.body = JSON.stringify(body);
	const response = await fetch(`${PublicEnv.apiBaseUrl.replace(/\/$/, "")}${path}`, init);
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : { message: await response.text() };
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Bad Gateway" }, { status: 502 });
  }
}

export async function proxyBackendJson(
  request: Request,
  path: string,
  method: "POST" | "PUT" | "PATCH"
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  return proxyBackend(path, method, body);
}

type QueryParameter = string | readonly [source: string, target: string];

export async function proxyBackendQuery(
  request: Request,
  path: string,
  parameters: readonly QueryParameter[],
  options: { required?: readonly string[]; maxLimit?: number } = {}
) {
  const input = new URL(request.url).searchParams;
  for (const required of options.required ?? []) {
    if (!input.get(required)) {
      return NextResponse.json({ message: `${required} is required` }, { status: 400 });
    }
  }
  const limit = input.get("limit");
  if (limit && (!/^\d+$/.test(limit) || (options.maxLimit !== undefined && Number(limit) > options.maxLimit))) {
    return NextResponse.json({ message: "Invalid limit" }, { status: 400 });
  }
  const output = new URLSearchParams();
  for (const parameter of parameters) {
    const [source, target] = typeof parameter === "string" ? [parameter, parameter] : parameter;
    const value = input.get(source);
    if (value !== null && value !== "") output.set(target, value);
  }
  const query = output.toString();
  return proxyBackend(`${path}${query ? `?${query}` : ""}`, "GET");
}
