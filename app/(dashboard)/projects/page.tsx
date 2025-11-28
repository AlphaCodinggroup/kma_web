"use client";

import React, { useMemo, useState } from "react";
import PageHeader from "@shared/ui/page-header";
import { ProjectsTable } from "@features/projects/ui/ProjectsTable";
import ProjectsSearchCard from "@features/projects/ui/ProjectsSearchCard";
import CreateProjectDialog from "@features/projects/ui/CreateProjectDialog";
import EditProjectDialog from "@features/projects/ui/EditProjectDialog";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import ConfirmTitle from "@shared/ui/confirm-title";
import { useProjectsQuery } from "@features/projects/ui/hooks/useProjectsQuery";
import type { Project } from "@entities/projects/model";
import { useUsersQuery } from "@features/users/ui/hooks/useUsersQuery";
import type { UserSummary } from "@entities/user/list.model";
import { useDeleteProjectMutation } from "@features/projects/ui/hooks/useDeleteProjectMutation";

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

  const { data, isLoading, isError, refetch } = useProjectsQuery();
  const { data: auditorsData } = useUsersQuery({ role: "auditor" }, openCreate);
  const { mutate: deleteProject, isPending: isDeleting } =
    useDeleteProjectMutation({
      onSuccess: () => {
        setOpenDelete(false);
        setProjectToDelete(null);
        refetch();
      },
      onError: (err) => console.error("Failed to delete project", err),
    });

  const projects = useMemo<Project[]>(() => data?.items ?? [], [data]);

  const auditors = useMemo<UserSummary[]>(
    () => auditorsData?.items ?? [],
    [auditorsData]
  );

  const filtered = useMemo<Project[]>(() => {
    const list = projects ?? [];
    const q = query.trim().toLowerCase();
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
  }, [projects, query]);

  const handleEdit = (id: string) => {
    const row = projects.find((r) => r.id === id);
    if (!row) return;
    setSelectedProject(row);
    setOpenEdit(true);
  };

  const handleDelete = (id: string) => {
    const row = projects.find((r) => r.id === id);
    if (!row) return;
    setProjectToDelete({ id: row.id, name: row.name });
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    deleteProject(projectToDelete.id);
  };

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
          isError={isError}
          isLoading={isLoading}
          onError={refetch}
        />
      </ProjectsSearchCard>

      {/* Crear */}
      <CreateProjectDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        facilities={[]}
        auditors={auditors}
        onSubmit={() => setOpenCreate(false)}
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
    </div>
  );
};

export default ProjectsPage;
