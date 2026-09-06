import type {
  AuditAnswerUpdateResult,
  UpdateAuditAnswerInput,
} from "@entities/audit/model/audit-review-answer-update";

export async function updateAuditAnswer(
  input: UpdateAuditAnswerInput
): Promise<AuditAnswerUpdateResult> {
  const res = await fetch(
    `/api/audits-review/${encodeURIComponent(input.auditId)}/answers`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
	  body: JSON.stringify({ expected_version: input.expectedVersion, answers: input.answers }),
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
