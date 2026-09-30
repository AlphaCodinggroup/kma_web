"use client";

import React, { useMemo, use } from "react";
import AuditEditHeader from "@features/audits/ui/AuditEditHeader";
import AuditInfoPanel from "@features/audits/ui/AuditInfoPanel";
import AuditEditContent from "@features/audits/ui/AuditEditContent";
import { useAuditDetail } from "@features/audits/lib/hooks/useAuditDetail";
import { Retry } from "@shared/ui/Retry";

/** Parámetros de ruta y query de esta página. */
type AuditEditParams = { id: string };
type AuditEditSearchParams = { auditor?: string };

// El chequeo de tipos de Next 15 exige promesas en las props de página, pero en
// runtime pueden llegar resueltas (tests, render directo): el guard cubre ambas.
type MaybePromise<T> = T | Promise<T>;

type AuditEditPageProps = {
  params: Promise<AuditEditParams>;
  searchParams?: Promise<AuditEditSearchParams>;
};

export default function AuditEditPage(props: AuditEditPageProps) {
  // `use` debe invocarse en el cuerpo del componente, no en un helper.
  const rawParams: MaybePromise<AuditEditParams> = props.params;
  const params = rawParams instanceof Promise ? use(rawParams) : rawParams;
  const rawSearchParams: MaybePromise<AuditEditSearchParams> =
    props.searchParams ?? {};
  const searchParams =
    rawSearchParams instanceof Promise ? use(rawSearchParams) : rawSearchParams;

  const auditorFromQuery = searchParams.auditor;
  const auditId = params.id;
  const {
    data: auditDetail,
    isLoading: isAuditDetailLoading,
    isError: isAuditDetailError,
    refetch: refetchAuditDetail,
  } = useAuditDetail(auditId);

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

  if (isAuditDetailError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center py-4 sm:py-6">
        <Retry
          text="The audit could not be loaded."
          onClick={() => {
            void refetchAuditDetail();
          }}
        />
      </main>
    );
  }

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
          location={auditDetail?.location}
          auditorName={memoed.auditor || auditDetail?.auditorName}
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
