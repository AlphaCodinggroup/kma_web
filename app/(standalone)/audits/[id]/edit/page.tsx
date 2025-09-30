import React from "react";
import AuditEditHeader from "@features/audits/ui/AuditEditHeader";
import AuditInfoPanel from "@features/audits/ui/AuditInfoPanel";
import AuditEditContent from "@features/audits/ui/AuditEditContent";
import type { QuestionItemVM } from "@features/audits/ui/AuditQuestionsList";
import type { ReportItemVM } from "@features/audits/ui/AuditEditContent";

// type PageProps = {
//   params: Promise<{ id: string }>;
//   searchParams?: Record<string, string | string[] | undefined>;
// };
const projectName = "Green Tower – Phase A";
const auditor = "María Pérez";
const status = "in_review" as const;
const auditDate = "2025-08-10";
const completedDate = null;

const questions = [
  {
    id: "q1",
    index: 1,
    text: "Are emergency exits clearly marked and unobstructed?",
    type: "yes_no" as const,
    answeredYes: true,
    notes:
      "All exits are properly illuminated and kept clear. Weekly checks performed.",
    attachments: [
      { id: "a1", name: "exits_overview.pdf", mime: "application/pdf" },
      { id: "a2", name: "exit-sign-01.jpg", mime: "image/jpeg" },
    ],
  },
  {
    id: "q2",
    index: 2,
    text: "Are fire extinguishers inspected within the last 12 months?",
    type: "yes_no" as const,
    answeredYes: true,
    notes: "Stickers show inspection done 3 months ago.",
    attachments: [
      { id: "a3", name: "extinguishers-list.pdf", mime: "application/pdf" },
    ],
  },
  {
    id: "q3",
    index: 3,
    text: "Is there any exposed wiring in common areas?",
    type: "yes_no" as const,
    answeredYes: false,
    notes:
      "Detected exposed wiring near the elevator shaft on level 3. Needs immediate fix.",
    attachments: [{ id: "a4", name: "wiring-photo.jpg", mime: "image/jpeg" }],
  },
  {
    id: "q4",
    index: 4,
    text: "Is there any exposed wiring in common areas?",
    type: "yes_no" as const,
    answeredYes: false,
    notes:
      "Detected exposed wiring near the elevator shaft on level 3. Needs immediate fix.",
    attachments: [
      { id: "a5", name: "wiring-photo.pdf", mime: "image/pdf" },
      { id: "a6", name: "wiring-photo.jpg", mime: "image/jpeg" },
    ],
  },
] satisfies QuestionItemVM[];

const reportItems: ReportItemVM[] = [
  {
    id: "r1",
    title: "Exposed wiring near elevator shaft",
    severity: "high",
    photos: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1600&auto=format&fit=crop&q=80",
    ],
    quantity: 12,
    unitPrice: 1500,
  },
  {
    id: "r2",
    title: "Replace damaged exit sign (stairwell B)",
    severity: "medium",
    photos: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&auto=format&fit=crop&q=80",
    ],
    quantity: 2,
    unitPrice: 180,
  },
  {
    id: "r3",
    title: "Paint touch-up in corridor L2",
    severity: "low",
    photos: [
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1600&auto=format&fit=crop&q=80",
    ],
    quantity: 1,
    unitPrice: 90,
  },
];

async function unwrap<T>(maybePromise: T | Promise<T>): Promise<T> {
  return maybePromise instanceof Promise ? await maybePromise : maybePromise;
}

export default async function AuditEditPage({
  params,
  searchParams,
}: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: auditId } = await unwrap(params);
  const sp = searchParams ? await unwrap(searchParams) : {};

  return (
    <main className="flex min-h-screen flex-col py-4 sm:py-6">
      <AuditEditHeader
        title={projectName}
        auditId={auditId}
        auditor={auditor}
        status={status}
        backHref="/audits"
      />

      <div className="mt-4 sm:mt-6">
        <AuditInfoPanel auditDate={auditDate} completedDate={completedDate} />
      </div>

      <div className="mt-4 sm:mt-5">
        <AuditEditContent questions={questions} reportItems={reportItems} />
      </div>
    </main>
  );
}
