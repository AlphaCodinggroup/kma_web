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

const AUDITOR_OPTIONS = [
  { id: "u1", name: "María Pérez" },
  { id: "u2", name: "Juan Gómez" },
  { id: "u3", name: "Ana Martínez" },
] as const;

const BUILDING_OPTIONS = [
  { id: "b1", name: "Green Tower" },
  { id: "b2", name: "Central Park" },
  { id: "b3", name: "Production Facility" },
] as const;

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

  const { data, isLoading, isError, error, refetch } = useProjectsQuery();

  const projects = useMemo<Project[]>(() => data?.items ?? [], [data]);

  const auditors = useMemo(() => [...AUDITOR_OPTIONS], []);
  const buildings = useMemo(() => [...BUILDING_OPTIONS], []);

  const filtered = useMemo<Project[]>(() => {
    const list = projects ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((it) => {
      const scalarMatch = [it.name, it.status, it.createdAt]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
      const usersMatch = Array.isArray(it.userIds)
        ? it.userIds.some((u) => String(u).toLowerCase().includes(q))
        : false;
      const facilitiesMatch = Array.isArray(it.facilityIds)
        ? it.facilityIds.some((f) => String(f).toLowerCase().includes(q))
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
    setOpenDelete(false);
    setProjectToDelete(null);
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
        auditors={auditors}
        buildings={buildings}
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
          buildings={buildings}
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
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
