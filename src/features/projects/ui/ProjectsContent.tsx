"use client";

import { useUrlParameter } from "@shared/lib/useUrlParameter";
import React, {
  useMemo,
  useState,
  useCallback,
  useImperativeHandle,
} from "react";
import {
  ProjectsTable,
  type SortField,
  type SortOrder,
} from "@features/projects/ui/ProjectsTable";
import ProjectsSearchCard from "@features/projects/ui/ProjectsSearchCard";
import ArchivedProjectsTable from "@features/projects/ui/ArchivedProjectsTable";
import CreateProjectDialog from "@features/projects/ui/CreateProjectDialog";
import EditProjectDialog from "@features/projects/ui/EditProjectDialog";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import ConfirmTitle from "@shared/ui/confirm-title";
import { useProjectsQuery } from "@features/projects/ui/hooks/useProjectsQuery";
import type { Project, ProjectListFilter } from "@entities/projects/model";
import { useDeleteProjectMutation } from "@features/projects/ui/hooks/useDeleteProjectMutation";
import { useArchiveProjectMutation } from "@features/projects/ui/hooks/useArchiveProjectMutation";
import { useRestoreProjectMutation } from "@features/projects/ui/hooks/useRestoreProjectMutation";
import { useCreateProjectMutation } from "@features/projects/ui/hooks/useCreateProjectMutation";
import { useUpdateProjectMutation } from "@features/projects/ui/hooks/useUpdateProjectMutation";
import { useDebouncedSearch } from "@shared/lib/useDebouncedSearch";
import { useProjectFormLookups } from "@features/projects/ui/hooks/useProjectFormLookups";
import type { ProjectUpsertValues } from "@features/projects/ui/ProjectsUpsertDialog";
import { buildProjectOptionalFields } from "@features/projects/lib/buildProjectOptionalFields";

type ProjectsContentProps = {
  createTriggerRef?: React.MutableRefObject<(() => void) | undefined>;
};

export const ProjectsContent: React.FC<ProjectsContentProps> = ({
  createTriggerRef,
}) => {
  const [query, setQuery] = useUrlParameter("projects_q");
  const [openCreate, setOpenCreate] = useState<boolean>(false);
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [openArchive, setOpenArchive] = useState<boolean>(false);
  const [projectToArchive, setProjectToArchive] = useState<Project | null>(
    null,
  );

  // Vista de proyectos archivados y restauración
  const [archive, setArchive] = useUrlParameter("projects_status", "active");
  const showArchived = archive === "archived";
  const [openRestore, setOpenRestore] = useState<boolean>(false);
  const [projectToRestore, setProjectToRestore] = useState<Project | null>(
    null,
  );

  // Sorting state
  const [sort, setSort] = useUrlParameter("projects_sort");
  const [order, setOrder] = useUrlParameter("projects_order");
  const sortField: SortField | null = ["name", "auditor", "facility", "status", "createdAt"].includes(sort) ? sort as SortField : null;
  const sortOrder: SortOrder = order === "asc" || order === "desc" ? order : null;

  const debouncedQuery = useDebouncedSearch(query);

  // Activos o archivados, según el toggle
  const projectFilters = useMemo<ProjectListFilter | undefined>(() => {
    return { status: showArchived ? "ARCHIVED" : "ACTIVE" };
  }, [showArchived]);

  const { data, isLoading, isError, refetch } =
    useProjectsQuery(projectFilters);

  const projects = useMemo<Project[]>(() => data?.items ?? [], [data]);

  // Flag común para cargar lookups cuando está abierto create o edit
  const lookupEnabled = openCreate || openEdit;

  const { auditors, facilityOptions, toProjectUsers, toProjectFacilities } =
    useProjectFormLookups({ enabled: lookupEnabled, projects });

  // Mutations
  const {
    mutateAsync: createProject,
    isPending: isCreating,
    error: createError,
  } = useCreateProjectMutation();

  const {
    mutateAsync: updateProject,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateProjectMutation();

  const { mutate: deleteProject, isPending: isDeleting, error: deleteError } =
    useDeleteProjectMutation({
      onSuccess: () => {
        setOpenDelete(false);
        setProjectToDelete(null);
        refetch();
      },
      onError: (err) => console.error("Failed to delete project", err),
    });

  const { mutateAsync: archiveProject, isPending: isArchiving, error: archiveError } =
    useArchiveProjectMutation();

  const {
    mutateAsync: restoreProject,
    isPending: isRestoring,
    error: restoreError,
    reset: resetRestore,
  } = useRestoreProjectMutation();

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

  // Sort function
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // Cycle through: asc -> desc -> null
        if (sortOrder === "asc") {
          setOrder("desc");
        } else if (sortOrder === "desc") {
          setOrder("");
          setSort("");
        }
      } else {
        setSort(field);
        setOrder("asc");
      }
    },
    [sortField, sortOrder, setSort, setOrder],
  );

  // Apply sorting to filtered data
  const sorted = useMemo<Project[]>(() => {
    if (!sortField || !sortOrder) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
          break;
        case "auditor":
          aVal = a.users?.[0]?.name?.toLowerCase() ?? "";
          bVal = b.users?.[0]?.name?.toLowerCase() ?? "";
          break;
        case "facility":
          aVal = a.facilities?.[0]?.name?.toLowerCase() ?? "";
          bVal = b.facilities?.[0]?.name?.toLowerCase() ?? "";
          break;
        case "status":
          aVal = a.status ?? "";
          bVal = b.status ?? "";
          break;
        case "createdAt":
          aVal = a.createdAt ?? "";
          bVal = b.createdAt ?? "";
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortOrder]);

  // ---- Create ----
  const handleCreateSubmit = useCallback(
    async (values: ProjectUpsertValues) => {
      try {
        const users = toProjectUsers(values.auditorIds);

        const optionalFields = buildProjectOptionalFields(values);

        const facilities = toProjectFacilities(values.facilityIds);

        await createProject({
          name: values.name,
          ...optionalFields,
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
    [createProject, refetch, toProjectUsers, toProjectFacilities],
  );

  // ---- Edit ----
  const handleEdit = useCallback(
    (id: string) => {
      const row = projects.find((r) => r.id === id);
      if (!row) return;
      setSelectedProject(row);
      setOpenEdit(true);
    },
    [projects],
  );

  const handleEditSubmit = useCallback(
    async (values: ProjectUpsertValues & { id: string }) => {
      try {
        const users = toProjectUsers(values.auditorIds);

        const optionalFields = buildProjectOptionalFields(values);

        const facilities = toProjectFacilities(values.facilityIds);

        await updateProject({
          id: values.id,
          name: values.name,
          ...optionalFields,
          users,
          facilities,
        });

        setOpenEdit(false);
        setSelectedProject(null);
        await refetch();
      } catch (err) {
        console.error("Failed to update project", err);
      }
    },
    [updateProject, refetch, toProjectUsers, toProjectFacilities],
  );

  // ---- Delete ----
  const handleDelete = useCallback(
    (id: string) => {
      const row = projects.find((r) => r.id === id);
      if (!row) return;
      setProjectToDelete({ id: row.id, name: row.name });
      setOpenDelete(true);
    },
    [projects],
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
    [projects],
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

  // ---- Restore ----
  const handleRestore = useCallback(
    (id: string) => {
      const row = projects.find((r) => r.id === id);
      if (!row) return;
      resetRestore();
      setProjectToRestore(row);
      setOpenRestore(true);
    },
    [projects, resetRestore],
  );

  const confirmRestore = useCallback(async () => {
    if (!projectToRestore) return;

    try {
      await restoreProject({ id: projectToRestore.id });
      setOpenRestore(false);
      setProjectToRestore(null);
    } catch (err) {
      // El diálogo queda abierto y muestra el error del backend.
      console.error("Failed to restore project", err);
    }
  }, [restoreProject, projectToRestore]);

  // Expose create trigger to parent via ref
  useImperativeHandle(
    createTriggerRef,
    () => () => {
      setOpenCreate(true);
    },
    [],
  );

  const handleOpenCreate = useCallback(() => {
    setOpenCreate(true);
  }, []);

  return (
    <>
      <ProjectsSearchCard
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search projects by Project name, Auditor, facility or Status..."
        onCreateClick={handleOpenCreate}
        showArchived={showArchived}
        onToggleArchived={() => setArchive(showArchived ? "active" : "archived")}
      >
        {showArchived ? (
          <ArchivedProjectsTable
            items={sorted}
            onRestore={handleRestore}
            isError={isError}
            isLoading={isLoading}
            onError={refetch}
          />
        ) : (
          <ProjectsTable
            items={sorted}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onArchive={handleArchive}
            isError={isError}
            isLoading={isLoading}
            onError={refetch}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onResetSort={() => { setSort(""); setOrder(""); }}
          />
        )}
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
          project={selectedProject}
          auditors={auditors}
          facilities={facilityOptions}
          onSubmit={handleEditSubmit}
          loading={isUpdating}
          error={updateError?.message ?? null}
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
          error={deleteError?.message ?? null}
          onConfirm={confirmDelete}
        />
      )}

      {/* Restaurar */}
      {projectToRestore && (
        <ConfirmDialog
          open={openRestore}
          variant="primary"
          onOpenChange={(o) => {
            setOpenRestore(o);
            if (!o) setProjectToRestore(null);
          }}
          title={
            <ConfirmTitle
              action="restore"
              subject={projectToRestore.name ?? "this project"}
            />
          }
          description={
            restoreError?.message ??
            "This project will go back to the active list."
          }
          confirmLabel="Restore"
          cancelLabel="Cancel"
          loading={isRestoring}
          onConfirm={confirmRestore}
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
          error={archiveError?.message ?? null}
          onConfirm={confirmArchive}
        />
      )}
    </>
  );
};
