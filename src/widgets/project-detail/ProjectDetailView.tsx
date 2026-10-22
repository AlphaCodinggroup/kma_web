"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Audit } from "@entities/audit/model";
import type { Project } from "@entities/projects/model";
import { useProjectQuery } from "@features/projects/ui/hooks/useProjectQuery";
import { useProjectFormLookups } from "@features/projects/ui/hooks/useProjectFormLookups";
import { useUpdateProjectMutation } from "@features/projects/ui/hooks/useUpdateProjectMutation";
import { useDeleteProjectMutation } from "@features/projects/ui/hooks/useDeleteProjectMutation";
import EditProjectDialog from "@features/projects/ui/EditProjectDialog";
import type { ProjectUpsertValues } from "@features/projects/ui/ProjectsUpsertDialog";
import { buildProjectOptionalFields } from "@features/projects/lib/buildProjectOptionalFields";
import { projectDetailHref } from "@features/projects/lib/project-href";
import { useProjectFacilitiesQuery } from "@features/facilities/ui/hooks/useProjectFacilitiesQuery";
import { useProjectAudits } from "@features/audits/lib/hooks/useProjectAudits";
import { useOpenAuditReview } from "@features/audits/lib/hooks/useOpenAuditReview";
import { useDeleteAudit } from "@features/audits/lib/hooks/useDeleteAudit";
import NoReportNeededModal from "@features/audits/ui/NoReportNeededModal";
import { useReportsListQuery } from "@features/reports/lib/hooks/useReportsQuery";
import { useDownloadReportFile } from "@features/reports/lib/hooks/useDownloadReportFile";
import { useSession } from "@processes/auth/hooks";
import { isApiError } from "@shared/interceptors/error";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import ConfirmTitle from "@shared/ui/confirm-title";
import { Loading } from "@shared/ui/Loading";
import { Retry } from "@shared/ui/Retry";
import ProjectDetailHeader from "@widgets/project-detail/ProjectDetailHeader";
import ProjectFacilitySection from "@widgets/project-detail/ProjectFacilitySection";
import ProjectAuditsToolbar from "@widgets/project-detail/ProjectAuditsToolbar";
import { useProjectAuditFilters } from "@widgets/project-detail/useProjectAuditFilters";
import {
  buildAuditFilterOptions,
  facilityFilterValue,
  filterProjectAudits,
} from "@widgets/project-detail/lib/audit-filters";
import {
  groupAuditsByFacility,
  summarizeProjectAudits,
} from "@widgets/project-detail/lib/project-sections";

const EMPTY_PROJECTS: readonly Project[] = [];

export interface ProjectDetailViewProps {
  projectId: string;
}

/**
 * Detalle de un proyecto: cabecera con resumen, reporte y acciones, y una
 * sección por facility con sus auditorías.
 */
const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ projectId }) => {
  const router = useRouter();
  const { isAdmin } = useSession();

  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useProjectQuery(projectId);
  // La dirección y la ciudad salen de las facilities del propio proyecto.
  const { data: projectFacilities } = useProjectFacilitiesQuery(projectId);
  const {
    audits,
    isLoading: isAuditsLoading,
    isError: isAuditsError,
    refetch: refetchAudits,
  } = useProjectAudits(projectId);

  // El reporte es uno solo por proyecto: todas sus auditorías completadas.
  const { data: reportsData } = useReportsListQuery({ projectId });
  const report = reportsData?.items.find((item) => Boolean(item.reportUrl)) ?? null;
  const { download: downloadReport, activeId: downloadingReportId } =
    useDownloadReportFile();

  // ---- Secciones y resumen ----
  const facilitiesById = useMemo(
    () => new Map((projectFacilities ?? []).map((f) => [f.id, f])),
    [projectFacilities]
  );
  const allSections = useMemo(
    () => (project ? groupAuditsByFacility(project, audits, facilitiesById) : []),
    [project, audits, facilitiesById]
  );
  // Se cuentan las facilities listadas: incluye las que sólo aparecen en
  // auditorías, para que el número coincida con las secciones de la página.
  // El resumen es del proyecto entero: no sigue a los filtros.
  const summary = useMemo(() => {
    const { inProgress, completed } = summarizeProjectAudits(audits);
    const facilities = allSections.filter((section) => section.facilityId).length;
    const delivered = audits.filter(audit => audit.status === "final_report_sent_to_client").length;
    const unavailable = audits.filter(audit => audit.status === "unknown").length;
    return { facilities, inProgress, completed, delivered, unavailable };
  }, [audits, allSections]);

  // ---- Buscador y filtros ----
  const filterOptions = useMemo(
    () => buildAuditFilterOptions(allSections, audits),
    [allSections, audits]
  );
  const {
    filters,
    query,
    isFiltering,
    hasValues,
    queryString,
    setFilter,
    clear: clearFilters,
  } = useProjectAuditFilters(filterOptions);
  const visibleAudits = useMemo(
    () => (isFiltering ? filterProjectAudits(audits, filters, query) : audits),
    [isFiltering, audits, filters, query]
  );
  // Con filtros se muestran sólo las facilities con coincidencias, más la
  // elegida en el filtro aunque quede vacía.
  const sections = useMemo(() => {
    if (!project || !isFiltering) return allSections;
    return groupAuditsByFacility(project, visibleAudits, facilitiesById).filter(
      (section) =>
        section.audits.length > 0 ||
        (filters.facility !== "" &&
          facilityFilterValue(section.facilityId) === filters.facility)
    );
  }, [project, isFiltering, allSections, visibleAudits, facilitiesById, filters.facility]);

  // Back desde el QC vuelve al proyecto con los mismos filtros.
  const projectHref = projectDetailHref(projectId);
  const {
    openReview,
    editingId,
    noReportNeeded,
  } = useOpenAuditReview({
    returnTo: queryString ? `${projectHref}?${queryString}` : projectHref,
    onReady: () => void refetchAudits(),
  });

  const [reportError, setReportError] = useState<string | null>(null);
  const [auditDeleteError, setAuditDeleteError] = useState<string | null>(null);
  const [projectDeleteError, setProjectDeleteError] = useState<string | null>(null);

  // ---- Reporte ----
  const handleDownloadReport = useCallback(() => {
    if (!report) return;
    setReportError(null);
    void downloadReport(report).catch((error: unknown) => {
      console.error("[ProjectDetailView] Error downloading report:", error);
      setReportError("Error downloading the report. Please try again.");
    });
  }, [downloadReport, report]);

  // ---- Edición del proyecto ----
  const [openEdit, setOpenEdit] = useState(false);
  const { auditors, facilityOptions, toProjectUsers, toProjectFacilities } =
    useProjectFormLookups({
      enabled: openEdit,
      projects: project ? [project] : EMPTY_PROJECTS,
    });
  const {
    mutateAsync: updateProject,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateProjectMutation();

  const handleEditSubmit = useCallback(
    async (values: ProjectUpsertValues & { id: string }) => {
      try {
        await updateProject({
          id: values.id,
          name: values.name,
          ...buildProjectOptionalFields(values),
          users: toProjectUsers(values.auditorIds),
          facilities: toProjectFacilities(values.facilityIds),
        });
        setOpenEdit(false);
      } catch (err) {
        console.error("Failed to update project", err);
      }
    },
    [updateProject, toProjectUsers, toProjectFacilities]
  );

  // ---- Borrado del proyecto ----
  const [openDelete, setOpenDelete] = useState(false);
  const { mutate: deleteProject, isPending: isDeletingProject } =
    useDeleteProjectMutation({
      onSuccess: () => {
        setOpenDelete(false);
        router.push("/projects" as Route);
      },
      onError: (err) => { console.error("Failed to delete project", err); setProjectDeleteError("The project could not be deleted. Try again."); },
    });

  // ---- Borrado de auditorías ----
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);
  const {
    mutateAsync: deleteAudit,
    isPending: isDeletingAudit,
    variables: deletingAuditId,
  } = useDeleteAudit();

  const confirmDeleteAudit = useCallback(async () => {
    if (!auditToDelete) return;
    setAuditDeleteError(null);
    try {
      await deleteAudit(auditToDelete.id);
      setAuditToDelete(null);
    } catch (err) {
      console.error("Error deleting audit:", err);
      setAuditDeleteError("Error deleting the audit. Please try again.");
    }
  }, [auditToDelete, deleteAudit]);

  // Con datos previos se sigue mostrando el proyecto aunque un refetch falle
  // (p. ej. justo después de borrarlo, antes de volver al listado).
  if (!project) {
    if (isProjectLoading) return <Loading text="Loading project" />;

    const notFound = isApiError(projectError) && projectError.code === "NOT_FOUND";
    return notFound ? (
      <Retry
        text="This project does not exist or was deleted."
        textButton="Back to projects"
        onClick={() => router.push("/projects" as Route)}
      />
    ) : (
      <Retry
        text="The project could not be loaded."
        onClick={() => void refetchProject()}
      />
    );
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <ProjectDetailHeader
        project={project}
        summary={summary}
        isAdmin={isAdmin}
        reportAvailable={Boolean(report)}
        downloadingReport={Boolean(report) && downloadingReportId === report?.id}
        onDownloadReport={handleDownloadReport}
        onEdit={() => setOpenEdit(true)}
        onDelete={() => setOpenDelete(true)}
      />

      <section aria-label="Consolidated report" className="flex flex-wrap items-center justify-between gap-4 border-b border-l-2 border-[var(--kma-border)] border-l-[var(--kma-accent)] pb-5 pl-4">
        <div><h2 className="text-base font-semibold">Consolidated project report</h2><p className="mt-1 text-sm text-[var(--kma-muted)]">One report for all completed audits in this project.</p></div>
        <p className="text-sm font-semibold text-[var(--kma-primary)]">{report ? "Ready to download" : "Available after review and approval"}</p>
        {reportError && <p role="alert" className="w-full text-sm text-[var(--kma-danger)]">{reportError}</p>}
      </section>

      <section aria-label="Facilities" className="space-y-4">
        <h2 className="text-base font-semibold">Facilities</h2>
        {isAuditsError ? (
          <Retry
            text="The project's audits could not be loaded."
            onClick={() => void refetchAudits()}
          />
        ) : null}
        {isAuditsLoading ? (
          <p className="text-sm text-[var(--kma-muted)]">Loading audits…</p>
        ) : null}
        {!isAuditsLoading && audits.length > 0 ? (
          <ProjectAuditsToolbar
            filters={filters}
            options={filterOptions}
            onFilterChange={setFilter}
            onClear={clearFilters}
            hasValues={hasValues}
            isFiltering={isFiltering}
            shown={visibleAudits.length}
            total={audits.length}
          />
        ) : null}
        {sections.length === 0 && !isAuditsLoading && !isFiltering ? (
          <p className="rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] px-4 py-6 text-center text-sm text-[var(--kma-muted)]">
            This project has no facilities yet.
          </p>
        ) : null}
        {sections.length === 0 && !isAuditsLoading && isFiltering ? (
          <div className="rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] px-4 py-6 text-center text-sm text-[var(--kma-muted)]">
            <p>No audits match the filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 min-h-11 rounded border border-[var(--kma-border)] px-4 py-2 text-sm font-semibold text-[var(--kma-fg)] hover:bg-[var(--kma-subtle)]"
            >
              Clear filters
            </button>
          </div>
        ) : null}
        {!isAuditsLoading &&
          sections.map((section, index) => (
            <ProjectFacilitySection
              // Al empezar a filtrar se vuelven a montar abiertas.
              key={`${section.facilityId ?? "no-facility"}-${isFiltering ? "filtered" : "all"}`}
              section={section}
              defaultOpen={isFiltering || index === 0}
              filtered={isFiltering}
              onOpenReview={openReview}
              onDeleteAudit={setAuditToDelete}
              editingId={editingId}
              deletingId={isDeletingAudit ? (deletingAuditId ?? null) : null}
              onRetry={() => void refetchAudits()}
            />
          ))}
      </section>

      <EditProjectDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        project={project}
        auditors={auditors}
        facilities={facilityOptions}
        onSubmit={handleEditSubmit}
        loading={isUpdating}
        error={updateError?.message ?? null}
      />

      <ConfirmDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title={<ConfirmTitle action="delete" subject={project.name} />}
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeletingProject}
        error={projectDeleteError}
        onConfirm={() => deleteProject(project.id)}
      />

      {auditToDelete && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setAuditToDelete(null);
          }}
          title={
            <ConfirmTitle
              action="delete"
              subject={`the ${auditToDelete.flowName ?? "audit"} audit`}
              quoted={false}
            />
          }
          description="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          loading={isDeletingAudit}
          error={auditDeleteError}
          onConfirm={confirmDeleteAudit}
        />
      )}

      <NoReportNeededModal
        open={noReportNeeded.open}
        onOpenChange={noReportNeeded.onOpenChange}
      />
    </section>
  );
};

export default ProjectDetailView;
