/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import React, { useMemo } from "react";
import AuditEditHeader from "@features/audits/ui/AuditEditHeader";
import AuditInfoPanel from "@features/audits/ui/AuditInfoPanel";
import AuditEditContent from "@features/audits/ui/AuditEditContent";
import { useAuditDetail } from "@features/audits/lib/hooks/useAuditDetail";

export default function AuditEditPage(props: PageProps<"/audits/[id]/edit">) {
  const params = props.params as { id: string } | Promise<{ id: string }>;
  const searchParams =
    ((props as any).searchParams as
      | Record<string, string | string[] | undefined>
      | undefined) ?? {};
  const auditorFromQuery =
    typeof searchParams.auditor === "string" ? searchParams.auditor : undefined;
  const auditId = (params as any).id;
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
