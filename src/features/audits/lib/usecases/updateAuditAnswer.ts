import type {
  AuditAnswerUpdateResult,
  UpdateAuditAnswerInput,
} from "@entities/audit/model/audit-review-answer-update";

export async function updateAuditAnswer(
  input: UpdateAuditAnswerInput
): Promise<AuditAnswerUpdateResult> {
  // Sin estas guardas un auditId vacío pegaba en "/api/audits-review//answers"
  // y una lista de respuestas vacía se enviaba igual.
  if (!input?.auditId?.trim()) {
    throw new Error("updateAuditAnswer: auditId is required");
  }
  if (!input.answers?.length) {
    throw new Error("updateAuditAnswer: answers is required");
  }

  const res = await fetch(
    `/api/audits-review/${encodeURIComponent(input.auditId)}/answers`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answers: input.answers }),
    }
  );

  if (!res.ok) {
    let msg = "Failed to update answers";
    try {
      const errBody = await res.json();
      if (errBody.message) msg = errBody.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}
