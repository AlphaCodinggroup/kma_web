import React from "react";
import AuditEditHeader from "@features/audits/ui/AuditEditHeader";
import AuditInfoPanel from "@features/audits/ui/AuditInfoPanel";
import AuditEditContent from "@features/audits/ui/AuditEditContent";
import type { QuestionItemVM } from "@features/audits/ui/AuditQuestionsList";

const projectName = "Green Tower – Phase A";
const auditor = "María Pérez";
const status = "draft_report_pending_review" as const;
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

export default async function AuditEditPage(
  props: PageProps<"/audits/[id]/edit">
) {
  const { id: auditId } = await props.params;

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
        <AuditEditContent questions={questions} id={auditId} />
      </div>
    </main>
  );
}
