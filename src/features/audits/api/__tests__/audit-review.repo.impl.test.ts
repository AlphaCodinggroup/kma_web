// ---------------------------------------------------------------------------
// Tests del repositorio de detalle de revisión (QC) de auditorías.
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
  createAuditReviewDetailRepo,
  auditReviewDetailRepo,
} from "../audit-review.repo.impl";
import {
  mapAuditReviewDTO,
  type AuditReviewDTO,
} from "@entities/audit/lib/audit-review.mappers";
import {
  mapAuditFindingUpdateResponseDTOToDomain,
  mapUpdateAuditFindingInputToDTO,
  type AuditFindingUpdateResponseDTO,
} from "@entities/audit/lib/audit-review-finding-update.mappers";
import {
  mapCompleteReviewResponseDTOToDomain,
  type CompleteReviewResponseDTO,
} from "@entities/audit/lib/completeReview.mappers";
import {
  mapAuditReviewStatusChangeDTOToDomain,
  mapUpdateAuditReviewStatusInputToDTO,
  type AuditReviewStatusChangeDTO,
} from "@entities/audit/lib/audit-review-status.mappers";

const API_BASE = `${window.location.origin}/api`;

const reviewDTO: AuditReviewDTO = {
  audit_id: "audit-1",
  flow_id: "flow-1",
  project_id: "project-1",
  status: "draft_report_in_review",
  findings: [
    {
      question_code: "Q1",
      answer: "YES",
      quantity: 1,
      cost: 10,
      total_cost: 10,
    },
  ],
  total_cost: 10,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

const completeDTO: CompleteReviewResponseDTO = {
  audit_id: "audit-1",
  status: "final_report_sent_to_client",
  message: "Report generated",
  request_id: "req-1",
};

const statusDTO: AuditReviewStatusChangeDTO = {
  audit_id: "audit-1",
  old_status: "draft_report_pending_review",
  new_status: "draft_report_in_review",
  message: "Status updated",
};

const findingDTO: AuditFindingUpdateResponseDTO = {
  audit_id: "audit-1",
  question_code: "Q1",
  status: "updated",
  message: "Finding updated",
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getReviewDetail
// ---------------------------------------------------------------------------

describe("getReviewDetail", () => {
  it.each([
    ["review-1", `${API_BASE}/audits/audit-reviews/review-1`],
    ["review/1", `${API_BASE}/audits/audit-reviews/review%2F1`],
    ["r b#1", `${API_BASE}/audits/audit-reviews/r%20b%231`],
  ])("GETs the encoded URL for %s", async (id, expectedUrl) => {
    http.get.mockResolvedValueOnce({ data: reviewDTO });

    await createAuditReviewDetailRepo().getReviewDetail(id);

    expect(http.get).toHaveBeenCalledOnce();
    expect(http.get).toHaveBeenCalledWith(expectedUrl);
  });

  it("maps the response into the domain review detail", async () => {
    http.get.mockResolvedValueOnce({ data: reviewDTO });

    const detail = await createAuditReviewDetailRepo().getReviewDetail("r-1");

    expect(detail).toEqual(mapAuditReviewDTO(reviewDTO));
    expect(detail.auditId).toBe("audit-1");
    expect(detail.findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// completeReview
// ---------------------------------------------------------------------------

describe("completeReview", () => {
  it.each([
    ["audit-1", `${API_BASE}/audits-review/audit-1/complete-review`],
    ["audit/1", `${API_BASE}/audits-review/audit%2F1/complete-review`],
  ])("POSTs to the encoded URL for %s", async (id, expectedUrl) => {
    http.post.mockResolvedValueOnce({ data: completeDTO });

    await createAuditReviewDetailRepo().completeReview(id);

    expect(http.post).toHaveBeenCalledWith(expectedUrl);
  });

  it("maps the response into the domain result", async () => {
    http.post.mockResolvedValueOnce({ data: completeDTO });

    const result = await createAuditReviewDetailRepo().completeReview("audit-1");

    expect(result).toEqual(mapCompleteReviewResponseDTOToDomain(completeDTO));
    expect(result.requestId).toBe("req-1");
  });

  it("defaults the message to an empty string", async () => {
    http.post.mockResolvedValueOnce({
      data: { ...completeDTO, message: null },
    });

    const result = await createAuditReviewDetailRepo().completeReview("audit-1");

    expect(result.message).toBe("");
  });
});

// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------

describe("updateStatus", () => {
  const input = {
    auditId: "audit-1",
    status: "draft_report_in_review" as const,
  };

  it("PATCHes the status endpoint with the mapped payload", async () => {
    http.patch.mockResolvedValueOnce({ data: statusDTO });

    await createAuditReviewDetailRepo().updateStatus(input);

    expect(http.patch).toHaveBeenCalledWith(
      `${API_BASE}/audits-review/audit-1/status`,
      mapUpdateAuditReviewStatusInputToDTO(input)
    );
    // El body sólo lleva el status; auditId viaja en la URL.
    expect(http.patch).toHaveBeenCalledWith(expect.any(String), {
      status: "draft_report_in_review",
    });
  });

  it("encodes the audit id in the URL", async () => {
    http.patch.mockResolvedValueOnce({ data: statusDTO });

    await createAuditReviewDetailRepo().updateStatus({
      ...input,
      auditId: "audit/1",
    });

    expect(http.patch).toHaveBeenCalledWith(
      `${API_BASE}/audits-review/audit%2F1/status`,
      expect.anything()
    );
  });

  it("maps the response into the domain status change", async () => {
    http.patch.mockResolvedValueOnce({ data: statusDTO });

    const result = await createAuditReviewDetailRepo().updateStatus(input);

    expect(result).toEqual(mapAuditReviewStatusChangeDTOToDomain(statusDTO));
    expect(result.oldStatus).toBe("draft_report_pending_review");
    expect(result.newStatus).toBe("draft_report_in_review");
  });
});

// ---------------------------------------------------------------------------
// updateFinding
// ---------------------------------------------------------------------------

describe("updateFinding", () => {
  it("PATCHes the finding endpoint encoding both path segments", async () => {
    http.patch.mockResolvedValueOnce({ data: findingDTO });

    await createAuditReviewDetailRepo().updateFinding({
      auditId: "audit/1",
      questionCode: "Q 1#a",
      quantity: 3,
    });

    expect(http.patch).toHaveBeenCalledWith(
      `${API_BASE}/audits-review/audit%2F1/findings/Q%201%23a`,
      expect.anything()
    );
  });

  // Tabla de payloads: el body enviado es exactamente el del mapper.
  it.each([
    [
      "quantity, trimmed notes and photos",
      {
        auditId: "audit-1",
        questionCode: "Q1",
        quantity: 2,
        notes: "  needs a ramp  ",
        photos: [
          { url: " https://cdn/a.jpg ", includeInReport: true },
          { url: "   " },
        ],
      },
      {
        quantity: 2,
        notes: "needs a ramp",
        photos: [{ url: "https://cdn/a.jpg", include_in_report: true }],
      },
    ],
    [
      "an explicit null note",
      { auditId: "audit-1", questionCode: "Q1", notes: null },
      { notes: null },
    ],
    [
      "an empty note collapsed to null",
      { auditId: "audit-1", questionCode: "Q1", notes: "   " },
      { notes: null },
    ],
    [
      "nothing but the identifiers",
      { auditId: "audit-1", questionCode: "Q1" },
      {},
    ],
    [
      "a non finite quantity that is dropped",
      { auditId: "audit-1", questionCode: "Q1", quantity: Number.NaN },
      {},
    ],
  ])("sends the mapper payload for %s", async (_label, input, expectedBody) => {
    http.patch.mockResolvedValueOnce({ data: findingDTO });

    await createAuditReviewDetailRepo().updateFinding(input);

    expect(http.patch).toHaveBeenCalledWith(
      `${API_BASE}/audits-review/audit-1/findings/Q1`,
      expectedBody
    );
    expect(mapUpdateAuditFindingInputToDTO(input)).toEqual(expectedBody);
  });

  it("maps the response into the domain result", async () => {
    http.patch.mockResolvedValueOnce({ data: findingDTO });

    const result = await createAuditReviewDetailRepo().updateFinding({
      auditId: "audit-1",
      questionCode: "Q1",
    });

    expect(result).toEqual(
      mapAuditFindingUpdateResponseDTOToDomain(findingDTO)
    );
    expect(result.status).toBe("updated");
  });

  it("propagates the transport error", async () => {
    const err = { code: "UNPROCESSABLE_ENTITY", message: "bad quantity" };
    http.patch.mockRejectedValueOnce(err);

    await expect(
      createAuditReviewDetailRepo().updateFinding({
        auditId: "audit-1",
        questionCode: "Q1",
      })
    ).rejects.toEqual(err);
  });
});

// ---------------------------------------------------------------------------
// Inyección y singleton
// ---------------------------------------------------------------------------

describe("client injection", () => {
  it("uses the injected axios instance", async () => {
    const injected = {
      get: vi.fn().mockResolvedValue({ data: reviewDTO }),
      post: vi.fn(),
      patch: vi.fn(),
    };

    await createAuditReviewDetailRepo(
      injected as unknown as AxiosInstance
    ).getReviewDetail("r-1");

    expect(injected.get).toHaveBeenCalledOnce();
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("auditReviewDetailRepo singleton", () => {
  it("is wired to the default http client", async () => {
    http.get.mockResolvedValueOnce({ data: reviewDTO });

    await auditReviewDetailRepo.getReviewDetail("r-9");

    expect(http.get).toHaveBeenCalledWith(
      `${API_BASE}/audits/audit-reviews/r-9`
    );
  });
});
