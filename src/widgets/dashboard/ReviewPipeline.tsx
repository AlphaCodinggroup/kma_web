import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, CheckCheck, ScanEye } from "lucide-react";

type ReviewPipelineProps = { pending: string; inReview: string; delivered: string };

export default function ReviewPipeline({ pending, inReview, delivered }: ReviewPipelineProps) {
  const stages = [
    { label: "Pending review", count: pending, detail: "Open review queue", status: "draft_report_pending_review", icon: ArrowUpRight },
    { label: "In review", count: inReview, detail: "Continue quality checks", status: "draft_report_in_review", icon: ScanEye },
    { label: "Delivered", count: delivered, detail: "View delivered audits", status: "final_report_sent_to_client", icon: CheckCheck },
  ];
  return (
    <section aria-label="Review pipeline" className="grid overflow-hidden rounded-lg border border-[var(--kma-border)] grid-cols-3">
      {stages.map(({ label, count, detail, status, icon: Icon }, index) => (
        <Link key={status} href={`/audits?status=${status}` as Route} className={`kma-review-stage group flex min-h-[120px] md:min-h-[140px] flex-col justify-between gap-3 px-3 py-4 sm:py-5 no-underline transition-colors sm:px-6 ${index === 0 ? "kma-theme-panel bg-[var(--kma-brand)] hover:bg-[var(--kma-subtle)]" : "border-l border-[var(--kma-border)] bg-[var(--kma-surface)] hover:bg-[var(--kma-subtle)]"}`}>
          <div className="flex min-h-10 items-start justify-between gap-3 md:min-h-0 md:items-center"><span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--kma-fg)]"><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 ${index === 0 ? "bg-[var(--kma-accent)]" : "bg-[var(--kma-border)]"}`} />{label}</span><Icon className="hidden h-4 w-4 shrink-0 text-[var(--kma-muted)] md:block" aria-hidden="true" /></div>
          <div className="flex flex-wrap items-end justify-between gap-2"><span className={`font-heading text-[32px] md:text-[40px] font-medium leading-none tabular-nums tracking-[-0.04em] ${index === 0 ? "text-[var(--kma-primary)]" : "text-[var(--kma-fg)]"}`}>{count}</span><span className="sr-only pb-0.5 text-sm text-[var(--kma-muted)] group-hover:text-[var(--kma-primary)] md:not-sr-only">{detail}</span></div>
        </Link>
      ))}
    </section>
  );
}
