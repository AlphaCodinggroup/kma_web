"use client";

import React, { useMemo, useState, useCallback } from "react";
import PageHeader from "@shared/ui/page-header";
import { ProjectsTable } from "@features/projects/ui/ProjectsTable";
import ProjectsSearchCard from "@features/projects/ui/ProjectsSearchCard";
import CreateProjectDialog from "@features/projects/ui/CreateProjectDialog";
import EditProjectDialog from "@features/projects/ui/EditProjectDialog";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import ConfirmTitle from "@shared/ui/confirm-title";
import { useProjectsQuery } from "@features/projects/ui/hooks/useProjectsQuery";
import type { Project, ProjectListFilter } from "@entities/projects/model";
import { useUsersQuery } from "@features/users/ui/hooks/useUsersQuery";
import type { UserSummary } from "@entities/user/list.model";
import { useDeleteProjectMutation } from "@features/projects/ui/hooks/useDeleteProjectMutation";
import { useArchiveProjectMutation } from "@features/projects/ui/hooks/useArchiveProjectMutation";
import { useCreateProjectMutation } from "@features/projects/ui/hooks/useCreateProjectMutation";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import { useFacilitiesQuery } from "@features/facilities/ui/hooks/useFacilitiesQuery";
import type { FacilityListFilter } from "@entities/facility/model";
import type { ProjectUpsertValues } from "@features/projects/ui/ProjectsUpsertDialog";

const ProjectsPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [openCreate, setOpenCreate] = useState<boolean>(false);
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
    auditorId?: string | undefined;
    buildingId?: string | undefined;
  } | null>(null);

  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [openArchive, setOpenArchive] = useState<boolean>(false);
  const [projectToArchive, setProjectToArchive] = useState<Project | null>(
    null
  );

  const debouncedQuery = useDebouncedSearch(query);

  // Solo proyectos activos desde backend
  const projectFilters = useMemo<ProjectListFilter | undefined>(() => {
    return { status: "ACTIVE" };
  }, []);

  const { data, isLoading, isError, refetch } =
    useProjectsQuery(projectFilters);

  const projects = useMemo<Project[]>(() => data?.items ?? [], [data]);

  // Auditors para el selector del modal
  const { data: auditorsData } = useUsersQuery({ role: "auditor" }, openCreate);

  const auditors = useMemo<UserSummary[]>(
    () => auditorsData?.items ?? [],
    [auditorsData]
  );

  // Facilities activas para el selector del modal
  const facilitiesFilters = useMemo<FacilityListFilter>(() => {
    return { status: "ACTIVE" };
  }, []);

  const { data: facilitiesData } = useFacilitiesQuery(
    facilitiesFilters,
    openCreate
  );

  const facilityOptions = useMemo(
    () =>
      (facilitiesData?.items ?? []).map((f) => ({
        id: f.id,
        name: f.name,
      })),
    [facilitiesData]
  );

  // Índices para mapear IDs → objetos { id, name }
  const auditorById = useMemo(() => {
    const map = new Map<string, UserSummary>();
    for (const a of auditors) {
      map.set(a.id, a);
    }
    return map;
  }, [auditors]);

  const facilityById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const f of facilityOptions) {
      map.set(f.id, f);
    }
    return map;
  }, [facilityOptions]);

  // Mutations
  const {
    mutateAsync: createProject,
    isPending: isCreating,
    error: createError,
  } = useCreateProjectMutation();

  const { mutate: deleteProject, isPending: isDeleting } =
    useDeleteProjectMutation({
      onSuccess: () => {
        setOpenDelete(false);
        setProjectToDelete(null);
        refetch();
      },
      onError: (err) => console.error("Failed to delete project", err),
    });

  const { mutateAsync: archiveProject, isPending: isArchiving } =
    useArchiveProjectMutation();

  // Filtro local por texto (name, status, createdAt, users, facilities)
  const filtered = useMemo<Project[]>(() => {
    const list = projects ?? [];
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((it) => {
      const scalarMatch = [it.name, it.status, it.createdAt]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));

      const usersMatch = Array.isArray(it.users)
        ? it.users.some((u) => u.name?.toLowerCase().includes(q))
        : false;

      const facilitiesMatch = Array.isArray(it.facilities)
        ? it.facilities.some((f) => f.name?.toLowerCase().includes(q))
        : false;

      return scalarMatch || usersMatch || facilitiesMatch;
    });
  }, [projects, debouncedQuery]);

  // ---- Create ----
  const handleCreateSubmit = useCallback(
    async (values: ProjectUpsertValues) => {
      try {
        const users =
          values.auditorIds
            ?.map((id) => auditorById.get(id))
            .filter((u): u is UserSummary => Boolean(u))
            .map((u) => ({
              id: u.id,
              name: u.name?.trim(),
            })) ?? [];

        const facilities =
          values.facilityIds
            ?.map((id) => facilityById.get(id))
            .filter(
              (
                f
              ): f is {
                id: string;
                name: string;
              } => Boolean(f)
            ) ?? [];

        await createProject({
          name: values.name,
          description: values.description,
          users,
          facilities,
          status: "ACTIVE",
        });

        setOpenCreate(false);
        await refetch();
      } catch (err) {
        console.error("Failed to create project", err);
      }
    },
    [createProject, refetch, auditorById, facilityById]
  );

  // ---- Edit ----
  const handleEdit = useCallback(
    (id: string) => {
      const row = projects.find((r) => r.id === id);
      if (!row) return;
      setSelectedProject(row);
      setOpenEdit(true);
    },
    [projects]
  );

  // ---- Delete ----
  const handleDelete = useCallback(
    (id: string) => {
      const row = projects.find((r) => r.id === id);
      if (!row) return;
      setProjectToDelete({ id: row.id, name: row.name });
      setOpenDelete(true);
    },
    [projects]
  );

  const confirmDelete = useCallback(async () => {
    if (!projectToDelete) return;
    deleteProject(projectToDelete.id);
  }, [deleteProject, projectToDelete]);

  // ---- Archive ----
  const handleArchive = useCallback(
    (id: string) => {
      const row = projects.find((r) => r.id === id);
      if (!row) return;
      setProjectToArchive(row);
      setOpenArchive(true);
    },
    [projects]
  );

  const confirmArchive = useCallback(async () => {
    if (!projectToArchive) return;

    try {
      await archiveProject({ id: projectToArchive.id });
      setOpenArchive(false);
      setProjectToArchive(null);
      await refetch();
    } catch (err) {
      console.error("Failed to archive project", err);
    }
  }, [archiveProject, projectToArchive, refetch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects Management"
        subtitle="Manage audit projects and assignments"
        verticalAlign="center"
        primaryAction={{
          label: "New Project",
          onClick: () => setOpenCreate(true),
        }}
      />

      <ProjectsSearchCard
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search projects by Project name, Auditor, facility or Status..."
      >
        <ProjectsTable
          items={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onArchive={handleArchive}
          isError={isError}
          isLoading={isLoading}
          onError={refetch}
        />
      </ProjectsSearchCard>

      {/* Crear */}
      <CreateProjectDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        facilities={facilityOptions}
        auditors={auditors}
        onSubmit={handleCreateSubmit}
        loading={isCreating}
        error={createError?.message ?? null}
      />

      {/* Editar */}
      {selectedProject && (
        <EditProjectDialog
          open={openEdit}
          onOpenChange={(o) => {
            setOpenEdit(o);
            if (!o) setSelectedProject(null);
          }}
          project={{
            id: selectedProject.id,
            name: selectedProject.name,
            auditorId: selectedProject.auditorId ?? null,
            buildingId: selectedProject.buildingId ?? null,
          }}
          auditors={auditors}
          buildings={[]}
          onSubmit={() => {
            setOpenEdit(false);
            setSelectedProject(null);
          }}
        />
      )}

      {/* Eliminar */}
      {projectToDelete && (
        <ConfirmDialog
          open={openDelete}
          onOpenChange={(o) => {
            setOpenDelete(o);
            if (!o) setProjectToDelete(null);
          }}
          title={
            <ConfirmTitle action="delete" subject={projectToDelete.name} />
          }
          description="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          loading={isDeleting}
          onConfirm={confirmDelete}
        />
      )}

      {/* Archivar */}
      {projectToArchive && (
        <ConfirmDialog
          open={openArchive}
          onOpenChange={(o) => {
            setOpenArchive(o);
            if (!o) setProjectToArchive(null);
          }}
          title={
            <ConfirmTitle
              action="archive"
              subject={projectToArchive.name ?? "this project"}
            />
          }
          description="This project will be archived and removed from the active list, but it will not be deleted."
          confirmLabel="Archive"
          cancelLabel="Cancel"
          loading={isArchiving}
          onConfirm={confirmArchive}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
