import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@processes/auth/session";
import { pathSegment, proxyToBackend } from "@shared/api/backend-proxy";

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_BODY_BYTES = 4 * 1024 * 1024 + 4096;
const nonEmpty = z.string().trim().min(1).max(256);
const identity = {
  operation_id: z.string().uuid(),
  expected_revision: nonEmpty,
};
const file = {
  file_name: z
    .string()
    .min(1)
    .max(255)
    .regex(/\.xlsx$/i),
  file_content: z
    .string()
    .min(4)
    .max(4 * 1024 * 1024)
    .refine((value) => {
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          value,
        )
      )
        return false;
      const bytes = Buffer.from(value, "base64").length;
      return bytes > 0 && bytes <= MAX_FILE_BYTES;
    }),
};
const cell = z.string().refine(value => Buffer.byteLength(value, "utf8") <= 32768, "Cell exceeds limit");
const requiredCell = cell.refine(value => value.trim().length > 0, "Required field");
const item = z.object({
  flow_id: requiredCell, barrier_id: requiredCell, question_code: requiredCell,
  question: requiredCell, mitigation_id: cell,
  barrier_statement: requiredCell, proposed_mitigation: cell,
  adas_reference: requiredCell, cost: z.number().finite().nonnegative().nullable(), unit: cell,
}).strict();
const mutation = { ...identity, base_version: nonEmpty };
const schemas = {
  validate: z.object(file).strict(),
  imports: z.object({ ...file, ...identity }).strict(),
  upload: z.object({ ...file, ...identity }).strict(),
  activate: z.object({ version: nonEmpty, ...identity }).strict(),
};
type Context = { params: Promise<{ path: string[] }> };

function error(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

/** Limita la lectura real, aunque Content-Length esté ausente o sea falso. */
async function readBody(req: NextRequest): Promise<unknown> {
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES)
    throw new Error("Catalog request exceeds the 3 MiB file limit");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Invalid JSON body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("Catalog request exceeds the 3 MiB file limit");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    reader.releaseLock();
  }
}

async function handle(req: NextRequest, context: Context) {
  const session = await getServerSession();
  if (!session.authenticated || !session.user)
    return error("Unauthorized", 401);
  if (!["admin", "administrator"].includes(session.user.role))
    return error("Forbidden", 403);

  const { path } = await context.params;
  const resource = path[0];
  const operation = resource === "operations" && path.length === 2;
  const row = resource === "items" && path.length === 3;
  const create = resource === "items" && path.length === 1 && req.method === "POST";
  const read =
    (["status", "versions", "items", "operations", "export"].includes(resource) && path.length === 1) ||
    operation;
  const write = (Object.hasOwn(schemas, resource) && path.length === 1) || create || row;
  if (!read && !write) return error("Not found", 404);
  if ((!write && read && req.method !== "GET") || (write && !(row ? ["PUT", "DELETE"] : ["POST"]).includes(req.method)))
    return error("Method not allowed", 405);

  let upstreamPath = `/admin/catalog/${resource}`;
  if (operation) {
    const segment = pathSegment(path[1], "operation_id");
    if (!segment.ok) return segment.response;
    if (!z.string().uuid().safeParse(path[1]).success)
      return error("Invalid operation_id", 400);
    upstreamPath += `/${segment.value}`;
  }
  if (row) {
    for (const [index, label] of [[1, "flow_id"], [2, "catalog_item_id"]] as const) {
      const segment = pathSegment(path[index], label);
      if (!segment.ok) return segment.response;
      upstreamPath += `/${segment.value}`;
    }
  }
  if (write) {
    const origin = req.headers.get("origin");
    // Host conserva el origen público cuando Next escucha en una dirección interna.
    const requestOrigin = `${req.nextUrl.protocol}//${req.headers.get("host") ?? req.nextUrl.host}`;
    if (origin && origin !== requestOrigin)
      return error("Cross-origin catalog requests are forbidden", 403);
    if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      return error("Catalog requests require application/json", 415);
    let body: unknown;
    try {
      body = await readBody(req);
    } catch (cause) {
      return error(
        cause instanceof SyntaxError
          ? "Invalid JSON body"
          : cause instanceof Error
            ? cause.message
            : "Invalid JSON body",
        400,
      );
    }
    const schema = create || row ? z.object({ ...mutation, ...(req.method !== "DELETE" ? { item } : {}) }).strict() : schemas[resource as keyof typeof schemas];
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return error(
        "Invalid catalog request: check the fields, file limits, operation ID and expected revision",
        400,
      );
    return proxyToBackend(req, { path: upstreamPath, body: parsed.data });
  }
  return proxyToBackend(req, {
    path: upstreamPath,
    ...(resource === "export" ? { forwardQuery: ["version"], binary: { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", maxBytes: MAX_FILE_BYTES } } : {}),
    ...(["versions", "operations", "items"].includes(resource)
      ? { forwardQuery: resource === "items" ? ["limit", "cursor", "version", "q", "flow_id", "barrier_id"] : ["limit", "cursor"], numericQuery: { limit: resource === "items" ? 200 : 100 } }
      : {}),
  });
}

export const GET = handle;
export const POST = handle;

export const PUT = handle;
export const DELETE = handle;
