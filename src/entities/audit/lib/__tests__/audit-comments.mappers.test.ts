// ---------------------------------------------------------------------------
// Tests for the audit review comments mappers (both directions)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapCreateAuditCommentInputToDTO,
  mapUpdateAuditCommentInputToDTO,
  mapAuditCommentResponseDTOToDomain,
  mapAuditCommentsListDTOToDomain,
  type AuditCommentResponseDTO,
} from "../audit-comments.mappers";

// ---------------------------------------------------------------------------
// mapCreateAuditCommentInputToDTO
// ---------------------------------------------------------------------------

describe("mapCreateAuditCommentInputToDTO", () => {
  it("maps camelCase input to the snake_case body", () => {
    expect(
      mapCreateAuditCommentInputToDTO({
        auditId: "audit-1",
        stepId: "step-1",
        content: "Looks fine",
      })
    ).toEqual({
      audit_id: "audit-1",
      step_id: "step-1",
      content: "Looks fine",
    });
  });

  it("trims the content", () => {
    const dto = mapCreateAuditCommentInputToDTO({
      auditId: "a",
      stepId: "s",
      content: "  padded  ",
    });

    expect(dto.content).toBe("padded");
  });

  it("keeps a blank content as an empty string", () => {
    const dto = mapCreateAuditCommentInputToDTO({
      auditId: "a",
      stepId: "s",
      content: "   ",
    });

    // FIXME: el mapper no valida contenido vacio; se envia "" al backend en
    // lugar de rechazar el input en el borde.
    expect(dto.content).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapUpdateAuditCommentInputToDTO
// ---------------------------------------------------------------------------

describe("mapUpdateAuditCommentInputToDTO", () => {
  it("only sends step_id and content", () => {
    const dto = mapUpdateAuditCommentInputToDTO({
      commentId: "c-1",
      auditId: "audit-1",
      stepId: "step-1",
      content: "  updated  ",
    });

    expect(dto).toEqual({ step_id: "step-1", content: "updated" });
    expect(dto).not.toHaveProperty("audit_id");
    expect(dto).not.toHaveProperty("comment_id");
  });
});

// ---------------------------------------------------------------------------
// mapAuditCommentResponseDTOToDomain
// ---------------------------------------------------------------------------

describe("mapAuditCommentResponseDTOToDomain", () => {
  it("maps a full snake_case response", () => {
    const dto: AuditCommentResponseDTO = {
      id: "c-1",
      audit_id: "audit-1",
      step_id: "step-1",
      user_id: "user-1",
      content: "Comment body",
      version: 3,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    };

    expect(mapAuditCommentResponseDTOToDomain(dto)).toEqual({
      id: "c-1",
      auditId: "audit-1",
      stepId: "step-1",
      userId: "user-1",
      content: "Comment body",
      version: 3,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("accepts the camelCase variants", () => {
    const result = mapAuditCommentResponseDTOToDomain({
      id: "c-1",
      auditId: "audit-camel",
      stepId: "step-camel",
      userId: "user-camel",
    });

    expect(result.auditId).toBe("audit-camel");
    expect(result.stepId).toBe("step-camel");
    expect(result.userId).toBe("user-camel");
  });

  it("defaults every optional field when absent", () => {
    expect(mapAuditCommentResponseDTOToDomain({ id: "c-1" })).toEqual({
      id: "c-1",
      auditId: "",
      stepId: "",
      userId: "",
      content: "",
      version: 1,
      createdAt: "",
      updatedAt: "",
    });
  });

  it("defaults every optional field when explicitly null", () => {
    const result = mapAuditCommentResponseDTOToDomain({
      id: "c-1",
      audit_id: null,
      step_id: null,
      user_id: null,
      content: null,
      version: null,
      created_at: null,
      updated_at: null,
    });

    expect(result.auditId).toBe("");
    expect(result.content).toBe("");
    expect(result.version).toBe(1);
    expect(result.createdAt).toBe("");
  });

  it("keeps version 0 instead of falling back to 1", () => {
    expect(mapAuditCommentResponseDTOToDomain({ id: "c", version: 0 }).version).toBe(
      0
    );
  });

  it("parses a numeric string version", () => {
    expect(mapAuditCommentResponseDTOToDomain({ id: "c", version: "7" }).version).toBe(
      7
    );
  });

  it.each([
    ["non numeric string", "abc"],
    ["blank string", "  "],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("falls back to version 1 when version is %s", (_label, value) => {
    expect(
      mapAuditCommentResponseDTOToDomain({ id: "c", version: value as never })
        .version
    ).toBe(1);
  });

  it("uses updated_at as the fallback for createdAt", () => {
    const result = mapAuditCommentResponseDTOToDomain({
      id: "c-1",
      updated_at: "2026-05-05T00:00:00Z",
    });

    expect(result.createdAt).toBe("2026-05-05T00:00:00Z");
    expect(result.updatedAt).toBe("2026-05-05T00:00:00Z");
  });

  it("uses created_at as the fallback for updatedAt", () => {
    const result = mapAuditCommentResponseDTOToDomain({
      id: "c-1",
      created_at: "2026-06-06T00:00:00Z",
    });

    expect(result.updatedAt).toBe("2026-06-06T00:00:00Z");
  });

  it("does not trim or validate the date strings", () => {
    const result = mapAuditCommentResponseDTOToDomain({
      id: "c-1",
      created_at: " not-a-date ",
    });

    // FIXME: sin validacion de fecha, un valor invalido entra al dominio.
    expect(result.createdAt).toBe(" not-a-date ");
  });
});

// ---------------------------------------------------------------------------
// mapAuditCommentsListDTOToDomain
// ---------------------------------------------------------------------------

describe("mapAuditCommentsListDTOToDomain", () => {
  it("maps every comment of the list", () => {
    const result = mapAuditCommentsListDTOToDomain({
      comments: [{ id: "c-1" }, { id: "c-2", content: "second" }],
    });

    expect(result.comments).toHaveLength(2);
    expect(result.comments[1]?.content).toBe("second");
  });

  it.each([
    ["an empty array", { comments: [] }],
    ["a missing key", {}],
    ["a null value", { comments: null }],
    ["a non-array value", { comments: "nope" }],
  ])("returns an empty list for %s", (_label, input) => {
    expect(mapAuditCommentsListDTOToDomain(input as never)).toEqual({
      comments: [],
    });
  });
});
