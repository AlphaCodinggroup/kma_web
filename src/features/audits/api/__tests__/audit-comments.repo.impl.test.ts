// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de comentarios de auditoría.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosInstance } from "axios";

const { http } = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@shared/api/http.client", () => ({ httpClient: http, default: http }));

import {
  AuditCommentsRepoHttp,
  auditCommentsRepo,
} from "../audit-comments.repo.impl";
import {
  mapAuditCommentResponseDTOToDomain,
  mapAuditCommentsListDTOToDomain,
  mapCreateAuditCommentInputToDTO,
  mapUpdateAuditCommentInputToDTO,
  type AuditCommentResponseDTO,
} from "@entities/audit/lib/audit-comments.mappers";

const API_BASE = `${window.location.origin}/api`;

const commentDTO: AuditCommentResponseDTO = {
  id: "c-1",
  audit_id: "audit-1",
  user_id: "u-1",
  step_id: "step-1",
  content: "Looks good",
  version: 2,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// createComment
// ---------------------------------------------------------------------------

describe("AuditCommentsRepoHttp.createComment", () => {
  const input = {
    auditId: "audit-1",
    stepId: "step-1",
    content: "  Looks good  ",
  };

  it("posts to /comments with the mapped payload", async () => {
    http.post.mockResolvedValueOnce({ data: commentDTO });

    await new AuditCommentsRepoHttp().createComment(input);

    expect(http.post).toHaveBeenCalledOnce();
    expect(http.post).toHaveBeenCalledWith(
      `${API_BASE}/comments`,
      mapCreateAuditCommentInputToDTO(input)
    );
    // El mapper pasa a snake_case y recorta el contenido.
    expect(http.post).toHaveBeenCalledWith(`${API_BASE}/comments`, {
      audit_id: "audit-1",
      step_id: "step-1",
      content: "Looks good",
    });
  });

  it("maps the response into the domain comment", async () => {
    http.post.mockResolvedValueOnce({ data: commentDTO });

    const result = await new AuditCommentsRepoHttp().createComment(input);

    expect(result).toEqual(mapAuditCommentResponseDTOToDomain(commentDTO));
    expect(result.version).toBe(2);
    expect(result.userId).toBe("u-1");
  });

  it("propagates the transport error", async () => {
    const err = { code: "BAD_REQUEST", message: "invalid" };
    http.post.mockRejectedValueOnce(err);

    await expect(
      new AuditCommentsRepoHttp().createComment(input)
    ).rejects.toEqual(err);
  });
});

// ---------------------------------------------------------------------------
// updateComment
// ---------------------------------------------------------------------------

describe("AuditCommentsRepoHttp.updateComment", () => {
  const baseInput = {
    commentId: "c-1",
    auditId: "audit-1",
    stepId: "step-1",
    content: " Updated ",
  };

  it.each([
    ["c-1", `${API_BASE}/comments/c-1`],
    ["c/1", `${API_BASE}/comments/c%2F1`],
    ["c 1#2", `${API_BASE}/comments/c%201%232`],
  ])("encodes the comment id %s into %s", async (commentId, expectedUrl) => {
    http.put.mockResolvedValueOnce({ data: commentDTO });

    await new AuditCommentsRepoHttp().updateComment({
      ...baseInput,
      commentId,
    });

    expect(http.put).toHaveBeenCalledWith(expectedUrl, expect.anything());
  });

  it("sends only the fields produced by the update mapper", async () => {
    http.put.mockResolvedValueOnce({ data: commentDTO });

    await new AuditCommentsRepoHttp().updateComment(baseInput);

    expect(http.put).toHaveBeenCalledWith(
      `${API_BASE}/comments/c-1`,
      mapUpdateAuditCommentInputToDTO(baseInput)
    );
    // auditId no viaja en el body de update.
    expect(http.put).toHaveBeenCalledWith(`${API_BASE}/comments/c-1`, {
      step_id: "step-1",
      content: "Updated",
    });
  });

  it("maps the response into the domain comment", async () => {
    http.put.mockResolvedValueOnce({ data: commentDTO });

    const result = await new AuditCommentsRepoHttp().updateComment(baseInput);

    expect(result).toEqual(mapAuditCommentResponseDTOToDomain(commentDTO));
  });
});

// ---------------------------------------------------------------------------
// listByAudit
// ---------------------------------------------------------------------------

describe("AuditCommentsRepoHttp.listByAudit", () => {
  it.each([
    ["audit-1", `${API_BASE}/comments?audit_id=audit-1`],
    ["audit/1", `${API_BASE}/comments?audit_id=audit%2F1`],
    ["a b&c", `${API_BASE}/comments?audit_id=a%20b%26c`],
  ])("encodes the audit id %s into %s", async (auditId, expectedUrl) => {
    http.get.mockResolvedValueOnce({ data: { comments: [] } });

    await new AuditCommentsRepoHttp().listByAudit(auditId);

    expect(http.get).toHaveBeenCalledWith(expectedUrl);
  });

  it("maps the list payload into the domain list", async () => {
    const listDTO = { comments: [commentDTO] };
    http.get.mockResolvedValueOnce({ data: listDTO });

    const result = await new AuditCommentsRepoHttp().listByAudit("audit-1");

    expect(result).toEqual(mapAuditCommentsListDTOToDomain(listDTO));
    expect(result.comments).toHaveLength(1);
  });

  it.each([
    ["an empty object", {}],
    ["comments set to null", { comments: null }],
  ])("returns an empty list for %s", async (_label, payload) => {
    http.get.mockResolvedValueOnce({ data: payload });

    const result = await new AuditCommentsRepoHttp().listByAudit("audit-1");

    expect(result.comments).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Inyección de dependencias
// ---------------------------------------------------------------------------

describe("AuditCommentsRepoHttp client injection", () => {
  it("uses the injected axios instance", async () => {
    const injected = {
      get: vi.fn().mockResolvedValue({ data: { comments: [] } }),
      post: vi.fn(),
      put: vi.fn(),
    };

    await new AuditCommentsRepoHttp(
      injected as unknown as AxiosInstance
    ).listByAudit("audit-1");

    expect(injected.get).toHaveBeenCalledOnce();
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("auditCommentsRepo singleton", () => {
  it("is wired to the default http client", async () => {
    http.get.mockResolvedValueOnce({ data: { comments: [] } });

    await auditCommentsRepo.listByAudit("audit-9");

    expect(http.get).toHaveBeenCalledWith(
      `${API_BASE}/comments?audit_id=audit-9`
    );
  });
});
