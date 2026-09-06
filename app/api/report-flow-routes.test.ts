import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const proxyBackend = vi.hoisted(() => vi.fn(async () => new Response(null, { status: 204 })));
vi.mock("@shared/api/backend-proxy", () => ({ proxyBackend }));

import { POST as reopen } from "./audits-review/[auditId]/reopen/route";
import { POST as openReview } from "./audits-review/[auditId]/reviews/route";
import { GET as getJob } from "./report-jobs/[jobId]/route";
import { POST as retryJob } from "./report-jobs/[jobId]/retry/route";
import { POST as restoreReport } from "./reports/[auditId]/restore/route";
import { GET as listReports } from "./reports/route";

describe("report flow BFF routes", () => {
  it("forwards identifiers with URL encoding", async () => {
    await getJob({} as never, { params: Promise.resolve({ jobId: "job/a" }) });
    await retryJob({} as never, { params: Promise.resolve({ jobId: "job/a" }) });
    await openReview({} as never, { params: Promise.resolve({ auditId: "audit/a" }) });
    await restoreReport({} as never, { params: Promise.resolve({ auditId: "audit/a" }) });
    expect(proxyBackend).toHaveBeenNthCalledWith(1, "/report-jobs/job%2Fa", "GET");
    expect(proxyBackend).toHaveBeenNthCalledWith(2, "/report-jobs/job%2Fa/retry", "POST");
    expect(proxyBackend).toHaveBeenNthCalledWith(3, "/audits-review/audit%2Fa/reviews", "POST");
    expect(proxyBackend).toHaveBeenNthCalledWith(4, "/reports/audit%2Fa/restore", "POST");
  });

  it("forwards reopen bodies and rejects malformed JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ reason: "fix", expected_version: 2 }),
    });
    await reopen(request as never, { params: Promise.resolve({ auditId: "audit-1" }) });
    expect(proxyBackend).toHaveBeenLastCalledWith(
      "/audits-review/audit-1/reopen",
      "POST",
      { reason: "fix", expected_version: 2 }
    );

    const callsBeforeMalformed = proxyBackend.mock.calls.length;
    const response = await reopen(new Request("http://localhost", { method: "POST", body: "{" }) as never, {
      params: Promise.resolve({ auditId: "audit-1" }),
    });
    expect(response.status).toBe(400);
    expect(proxyBackend).toHaveBeenCalledTimes(callsBeforeMalformed);
  });

  it("forwards every supported report-list filter", async () => {
    await listReports(
      new NextRequest(
        "http://localhost/api/reports?project_id=p%2F1&user_id=u1&status=completed&limit=10&last_eval_id=job-1&sort_by=created_at&sort_order=asc&include_archived=true&ignored=value"
      )
    );

    expect(proxyBackend).toHaveBeenLastCalledWith(
      "/reports?project_id=p%2F1&user_id=u1&status=completed&limit=10&last_eval_id=job-1&sort_by=created_at&sort_order=asc&include_archived=true",
      "GET"
    );
  });
});
