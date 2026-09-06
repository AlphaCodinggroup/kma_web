import type { ReportJob, ReportJobDTO } from "@entities/report/model/report-job";
import { mapReportJob } from "@entities/report/model/report-job";

async function request(path: string, init?: RequestInit): Promise<ReportJob> {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as ReportJobDTO & { message?: string };
  if (!response.ok) throw new Error(body.message ?? `Report request failed (${response.status})`);
  return mapReportJob(body);
}

export const reportJobRepo = {
  get(jobId: string, signal?: AbortSignal) {
	return request(`/api/report-jobs/${encodeURIComponent(jobId)}`, signal ? { signal } : undefined);
  },
  retry(jobId: string) {
    return request(`/api/report-jobs/${encodeURIComponent(jobId)}/retry`, { method: "POST" });
  },
  restore(jobId: string) {
    return request(`/api/reports/${encodeURIComponent(jobId)}/restore`, { method: "POST" });
  },
};
