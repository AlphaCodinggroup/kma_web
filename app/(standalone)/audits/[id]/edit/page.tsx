"use client";

import React, { useMemo, use } from "react";
import AuditEditHeader from "@features/audits/ui/AuditEditHeader";
import AuditInfoPanel from "@features/audits/ui/AuditInfoPanel";
import AuditEditContent from "@features/audits/ui/AuditEditContent";
import { useAuditDetail } from "@features/audits/lib/hooks/useAuditDetail";

export default function AuditEditPage(props: PageProps<"/audits/[id]/edit">) {
  // Handle params and searchParams - they might be Promises in Next.js 15
  const params = props.params instanceof Promise
    ? use(props.params)
    : props.params;
  const searchParams = (props as any).searchParams instanceof Promise
    ? use((props as any).searchParams)
    : ((props as any).searchParams || {});

  const auditorFromQuery =
    typeof searchParams.auditor === "string" ? searchParams.auditor : undefined;
  const auditId = params.id;
  const { data: auditDetail, isLoading: isAuditDetailLoading } =
    useAuditDetail(auditId);

  const memoed = useMemo(() => {
    const title = auditDetail?.flowName ?? "";
    const status = auditDetail?.status ?? "draft_report_in_review";
    const createdAt = auditDetail?.createdAt ?? "";
    const updatedAt = auditDetail?.updatedAt ?? "";
    const auditor = auditorFromQuery ?? "";

    return {
      title,
      status,
      createdAt,
      updatedAt,
      auditor,
    };
  }, [auditDetail, auditorFromQuery]);

  return (
    <main className="flex min-h-screen flex-col py-4 sm:py-6">
      <AuditEditHeader
        title={memoed.title}
        auditor={memoed.auditor}
        status={memoed.status}
        createdAt={memoed.createdAt}
        updatedAt={memoed.updatedAt}
        backHref="/audits"
      />

      <div className="mt-4 sm:mt-6">
        <AuditInfoPanel
          auditDate={memoed.createdAt}
          completedDate={memoed.updatedAt}
          projectName={auditDetail?.projectName}
          facilityName={auditDetail?.facilityName}
        />
      </div>

      <div className="mt-4 sm:mt-5">
        <AuditEditContent
          id={auditId}
          auditDetail={auditDetail}
          isAuditDetailLoading={isAuditDetailLoading}
        />
      </div>
    </main>
  );
}
