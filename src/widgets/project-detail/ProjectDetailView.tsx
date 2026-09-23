"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Audit } from "@entities/audit/model";
import type { FacilityListFilter } from "@entities/facility/model";
import type { Project } from "@entities/projects/model";
import { useProjectQuery } from "@features/projects/ui/hooks/useProjectQuery";
import { useProjectFormLookups } from "@features/projects/ui/hooks/useProjectFormLookups";
import { useUpdateProjectMutation } from "@features/projects/ui/hooks/useUpdateProjectMutation";
import { useDeleteProjectMutation } from "@features/projects/ui/hooks/useDeleteProjectMutation";
import EditProjectDialog from "@features/projects/ui/EditProjectDialog";
import type { ProjectUpsertValues } from "@features/projects/ui/ProjectsUpsertDialog";
import { buildProjectOptionalFields } from "@features/projects/lib/buildProjectOptionalFields";
import { projectDetailHref } from "@features/projects/lib/project-href";
import { useFacilitiesQuery } from "@features/facilities/ui/hooks/useFacilitiesQuery";
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

// La dirección y la ciudad salen del listado de facilities activas: el backend
// todavía no filtra facilities por proyecto.
const ACTIVE_FACILITIES: FacilityListFilter = { status: "ACTIVE" };
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
  const { data: facilitiesData } = useFacilitiesQuery(ACTIVE_FACILITIES);
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
    () => new Map((facilitiesData?.items ?? []).map((f) => [f.id, f])),
    [facilitiesData]
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
    return { facilities, inProgress, completed };
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

  // ---- Reporte ----
  const handleDownloadReport = useCallback(() => {
    if (!report) return;
    void downloadReport(report).catch((error: unknown) => {
      console.error("[ProjectDetailView] Error downloading report:", error);
      alert("Error downloading the report. Please try again.");
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
      onError: (err) => console.error("Failed to delete project", err),
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
    try {
      await deleteAudit(auditToDelete.id);
      setAuditToDelete(null);
    } catch (err) {
      console.error("Error deleting audit:", err);
      alert("Error deleting the audit. Please try again.");
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
    <main className="flex w-full flex-col gap-6">
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

      <section aria-label="Facilities" className="space-y-3">
        <h2 className="text-lg font-bold">Facilities</h2>
        {isAuditsError ? (
          <Retry
            text="The project's audits could not be loaded."
            onClick={() => void refetchAudits()}
          />
        ) : null}
        {isAuditsLoading ? (
          <p className="text-sm text-gray-500">Loading audits…</p>
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
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
            This project has no facilities yet.
          </p>
        ) : null}
        {sections.length === 0 && !isAuditsLoading && isFiltering ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
            <p>No audits match the filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
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
          onConfirm={confirmDeleteAudit}
        />
      )}

      <NoReportNeededModal
        open={noReportNeeded.open}
        onOpenChange={noReportNeeded.onOpenChange}
      />
    </main>
  );
};

export default ProjectDetailView;
