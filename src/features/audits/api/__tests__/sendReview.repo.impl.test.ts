// ---------------------------------------------------------------------------
// Tests del repositorio de "enviar a revisión" y polling del estado.
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

import { createAuditReviewRepo, auditReviewRepo } from "../sendReview.repo.impl";
import {
  mapSendForReviewDTO,
  mapReviewProgressDTO,
  type SendForReviewDTO,
} from "@entities/audit/lib/sendReview.mappers";

const API_BASE = `${window.location.origin}/api`;

const dto: SendForReviewDTO = {
  audit_id: "audit-1",
  audit_review_id: "review-1",
  status: "draft_report_in_review",
  message: "Review started",
  review_ready: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createAuditReviewRepo.sendForReview", () => {
  it.each([
    ["audit-1", `${API_BASE}/audits/audit-1/send-for-review`],
    ["audit/1", `${API_BASE}/audits/audit%2F1/send-for-review`],
    ["a b#c", `${API_BASE}/audits/a%20b%23c/send-for-review`],
  ])("POSTs to the encoded URL for %s", async (auditId, expectedUrl) => {
    http.post.mockResolvedValueOnce({ data: dto });

    await createAuditReviewRepo().sendForReview(auditId);

    expect(http.post).toHaveBeenCalledOnce();
    expect(http.post).toHaveBeenCalledWith(expectedUrl);
  });

  it("maps the response into the domain result", async () => {
    http.post.mockResolvedValueOnce({ data: dto });

    const result = await createAuditReviewRepo().sendForReview("audit-1");

    expect(result).toEqual(mapSendForReviewDTO(dto));
    expect(result.auditReviewId).toBe("review-1");
    expect(result.reviewReady).toBe(true);
  });

  it("applies defaults for the optional fields", async () => {
    http.post.mockResolvedValueOnce({
      data: {
        audit_id: "audit-1",
        audit_review_id: "review-1",
        status: "draft_report_in_review",
      },
    });

    const result = await createAuditReviewRepo().sendForReview("audit-1");

    expect(result.message).toBe("");
    expect(result.reviewReady).toBe(false);
  });

  it("propagates the transport error", async () => {
    const err = { code: "CONFLICT", message: "already in review" };
    http.post.mockRejectedValueOnce(err);

    await expect(
      createAuditReviewRepo().sendForReview("audit-1")
    ).rejects.toEqual(err);
  });
});

describe("createAuditReviewRepo.pollReview", () => {
  it.each([
    ["review-1", `${API_BASE}/audits/audit-reviews/review-1`],
    ["review/1", `${API_BASE}/audits/audit-reviews/review%2F1`],
  ])("GETs the encoded review URL for %s", async (reviewId, expectedUrl) => {
    http.get.mockResolvedValueOnce({ data: dto });

    await createAuditReviewRepo().pollReview(reviewId);

    expect(http.get).toHaveBeenCalledWith(expectedUrl);
  });

  it("maps the polling payload into review progress", async () => {
    http.get.mockResolvedValueOnce({ data: dto });

    const progress = await createAuditReviewRepo().pollReview("review-1");

    expect(progress).toEqual(mapReviewProgressDTO(dto));
    expect(progress.status).toBe("draft_report_in_review");
  });
});

describe("client injection", () => {
  it("uses the injected axios instance for both operations", async () => {
    const injected = {
      get: vi.fn().mockResolvedValue({ data: dto }),
      post: vi.fn().mockResolvedValue({ data: dto }),
    };
    const repo = createAuditReviewRepo(injected as unknown as AxiosInstance);

    await repo.sendForReview("audit-1");
    await repo.pollReview("review-1");

    expect(injected.post).toHaveBeenCalledOnce();
    expect(injected.get).toHaveBeenCalledOnce();
    expect(http.post).not.toHaveBeenCalled();
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("auditReviewRepo singleton", () => {
  it("is wired to the default http client", async () => {
    http.post.mockResolvedValueOnce({ data: dto });

    await auditReviewRepo.sendForReview("audit-9");

    expect(http.post).toHaveBeenCalledWith(
      `${API_BASE}/audits/audit-9/send-for-review`
    );
  });
});
