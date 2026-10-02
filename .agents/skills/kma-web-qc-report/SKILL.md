---
name: kma-web-qc-report
description: Change the QC report preview, per-finding editing/saving, approve/complete-review, or the polling and download of the consolidated project PDF.
---

# KMA Web QC report

Use for `AuditEditContent.tsx`, `ReportPreview.tsx`, `ReportActionBar.tsx`, `useReportDrafts.ts`,
`useExportAuditReport.ts`, `src/shared/lib/report-format.ts`, or `src/shared/lib/download.ts`. Read
the [report rules](../../../docs/agents/project-context.md#report-rules) section of project context
before changing editability, save behavior, or formatting.

1. Preserve editing gated on `isAdmin && status === "draft_report_in_review"`, a quantity that
   cannot be emptied (only cleared to a non-negative number), and notes cleared with `""` rather than
   `null`. `useReportDrafts.ts` sends one `PATCH` per changed finding, sequentially; do not
   parallelize it without confirming the backend now supports concurrent finding writes.
2. Keep `report-format.ts`'s formatting in parity with the backend's PDF, since the preview exists to
   look like the final PDF: compare against `../kma-backend/lambdas/reports-worker/internal/generate-report/{pdf_service.go,report_formatter_service.go}`
   before changing a column, unit format, or measurement line.
3. A report is per project: the backend consolidates every eligible audit into one PDF at one
   `report_url`. Do not assume a report belongs to a single audit when changing the approve or
   download flow.
4. Verify end to end against the local platform: save a finding, approve, poll until the report URL
   appears, and open the downloaded PDF. Use [kma-web-local-validation](../kma-web-local-validation/SKILL.md)
   to prepare the stack. Report any step that could not be exercised (for example, no seeded audit in
   the right state).
