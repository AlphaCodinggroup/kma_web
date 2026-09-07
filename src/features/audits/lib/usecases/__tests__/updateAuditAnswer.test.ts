// ---------------------------------------------------------------------------
// Tests for the updateAuditAnswer use case (talks to the BFF through fetch)
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  AuditAnswerUpdateResult,
  UpdateAuditAnswerInput,
} from "@entities/audit/model/audit-review-answer-update";
import { updateAuditAnswer } from "../updateAuditAnswer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();

function makeInput(
  overrides: Partial<UpdateAuditAnswerInput> = {}
): UpdateAuditAnswerInput {
  return {
    auditId: "audit-1",
    answers: [{ step_id: "step-1", type: "Question", answer: "YES" }],
    ...overrides,
  };
}

function makeResult(): AuditAnswerUpdateResult {
  return {
    audit_id: "audit-1",
    status: "updated",
    message: "Answers updated",
  };
}

/** Respuesta mínima compatible con la parte de Response que usa el caso de uso. */
function fakeResponse(ok: boolean, json: () => Promise<unknown>) {
  return { ok, json } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateAuditAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs the answers to the audit review endpoint", async () => {
    const result = makeResult();
    fetchMock.mockResolvedValue(
      fakeResponse(true, () => Promise.resolve(result))
    );

    const input = makeInput();
    await expect(updateAuditAnswer(input)).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith("/api/audits-review/audit-1/answers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: input.answers }),
    });
  });

  it("encodes the audit id in the URL", async () => {
    fetchMock.mockResolvedValue(
      fakeResponse(true, () => Promise.resolve(makeResult()))
    );

    await updateAuditAnswer(makeInput({ auditId: "audit/1 2" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audits-review/audit%2F1%202/answers",
      expect.anything()
    );
  });

  // Sin las guardas, un auditId vacio pegaba en "/api/audits-review//answers" y
  // una lista de respuestas vacia se enviaba igual.
  it.each([
    [
      "an empty answers array",
      { answers: [] },
      "updateAuditAnswer: answers is required",
    ],
    [
      "an empty audit id",
      { auditId: "" },
      "updateAuditAnswer: auditId is required",
    ],
  ])("rejects %s without calling the backend", async (_label, patch, message) => {
    fetchMock.mockResolvedValue(
      fakeResponse(true, () => Promise.resolve(makeResult()))
    );

    await expect(updateAuditAnswer(makeInput(patch))).rejects.toThrow(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the error body carries a message",
      () => Promise.resolve({ message: "Audit is locked" }),
      "Audit is locked",
    ],
    [
      "the error body has no message",
      () => Promise.resolve({ code: "BAD_REQUEST" }),
      "Failed to update answers",
    ],
    [
      "the error body is not valid JSON",
      () => Promise.reject(new Error("Unexpected token")),
      "Failed to update answers",
    ],
  ])("throws when the response is not ok and %s", async (_label, json, message) => {
    fetchMock.mockResolvedValue(fakeResponse(false, json));

    await expect(updateAuditAnswer(makeInput())).rejects.toThrow(message);
  });

  it("propagates a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    await expect(updateAuditAnswer(makeInput())).rejects.toThrow("Network error");
  });
});
