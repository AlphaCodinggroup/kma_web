"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ActivityItem from "./ActivityItem";

export type Activity = {
  project: string;
  facility?: string | undefined;
  flow?: string | undefined;
  auditor: string;
  time: string;
  variant: "success" | "warning" | "info" | "danger" | "neutral";
};

type DashboardActivitySectionProps = {
  title?: string;
  subtitle?: string;
  items: Activity[];
  "data-testid"?: string;
};

const DashboardActivitySection: React.FC<DashboardActivitySectionProps> = ({ title = "Recent Activity", subtitle = "Latest audits completed by auditors", items, "data-testid": testId }) => {
  const isEmpty = !items || items.length === 0;
  return (
    <section data-testid={testId} className="min-w-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--kma-border)] pb-3">
        <div><h3 className="text-xl leading-7 font-semibold">{title}</h3><p className="mt-1 text-sm text-[var(--kma-muted)]">{subtitle}</p></div>
        <Link href="/audits" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[var(--kma-fg)] no-underline hover:text-[var(--kma-primary)]">View audits<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]">
        {isEmpty ? (
          <div className="px-6 py-12 text-center"><p className="text-sm font-medium">No recent activity</p><p className="mt-2 text-sm text-[var(--kma-muted)]">Completed audits will appear here.</p></div>
        ) : (
          <>
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-5 border-b border-[var(--kma-border)] bg-[var(--kma-subtle)] px-5 py-3 text-xs font-medium text-[var(--kma-muted)] md:grid"><span>Project &amp; facility</span><span>Audit flow</span><span>Completed by</span><span>Completed</span></div>
            <ul aria-label="Recent audit activity" className="divide-y divide-[var(--kma-border)]">
              {items.map((item, index) => <ActivityItem key={`${item.project}-${index}`} project={item.project} facility={item.facility} flow={item.flow} auditor={item.auditor} time={item.time} variant={item.variant} />)}
            </ul>
          </>
        )}
      </div>
    </section>
  );
};

export default DashboardActivitySection;
