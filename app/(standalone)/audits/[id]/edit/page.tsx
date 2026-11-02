"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import AuditEditHeader from "@features/audits/ui/AuditEditHeader";
import AuditInfoPanel from "@features/audits/ui/AuditInfoPanel";
import AuditEditContent from "@features/audits/ui/AuditEditContent";
import { useAuditDetail } from "@features/audits/lib/hooks/useAuditDetail";
import { Retry } from "@shared/ui/Retry";
import { resolveAuditBackHref } from "@features/audits/lib/audit-edit-href";
import ConfirmDialog from "@shared/ui/confirm-dialog";

/** Parámetros de ruta y query de esta página. */
type AuditEditParams = { id: string };
type AuditEditSearchParams = { auditor?: string; returnTo?: string };

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

  // Cambios sin guardar en la vista previa del reporte: se confirma antes de salir.
  const router = useRouter();
  const backHref = resolveAuditBackHref(searchParams.returnTo);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Algunos navegadores todavía exigen returnValue para mostrar el aviso.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const memoed = useMemo(() => {
    const title = auditDetail?.flowName ?? "";
    const status = auditDetail?.status ?? "unknown";
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
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col bg-[var(--kma-bg)]">
      <AuditEditHeader
        title={memoed.title}
        auditor={memoed.auditor || auditDetail?.auditorName || "Not assigned"}
        status={memoed.status}
        createdAt={memoed.createdAt}
        updatedAt={memoed.updatedAt}
        backHref={backHref}
        {...(isDirty ? { onBack: () => setConfirmLeave(true) } : {})}
      />

      <div className="border-b border-[var(--kma-border)] bg-[var(--kma-surface)] py-5">
        <AuditInfoPanel
          auditDate={memoed.createdAt}
          completedDate={memoed.updatedAt}
          projectName={auditDetail?.projectName}
          facilityName={auditDetail?.facilityName}
          location={auditDetail?.location}
          auditorName={memoed.auditor || auditDetail?.auditorName}
        />
      </div>

      <div className="bg-[var(--kma-bg)] pb-6">
        <AuditEditContent
          id={auditId}
          auditDetail={auditDetail}
          isAuditDetailLoading={isAuditDetailLoading}
          onDirtyChange={setIsDirty}
        />
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Discard unsaved changes?"
        description="The report has changes that were not saved. Leaving now discards them."
        confirmLabel="Discard and leave"
        cancelLabel="Stay"
        onConfirm={() => {
          setConfirmLeave(false);
          router.push(backHref);
        }}
      />
    </main>
  );
}
