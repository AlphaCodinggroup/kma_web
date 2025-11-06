"use client";

import React, { useMemo, useState } from "react";
import PageHeader from "@shared/ui/page-header";
import {
  ProjectsTable,
  type ProjectRowVM,
} from "@features/projects/ui/ProjectsTable";
import ProjectsSearchCard from "@features/projects/ui/ProjectsSearchCard";
import CreateProjectDialog from "@features/projects/ui/CreateProjectDialog";
import EditProjectDialog from "@features/projects/ui/EditProjectDialog";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import ConfirmTitle from "@shared/ui/confirm-title";

const SEED_ITEMS: ProjectRowVM[] = [
  {
    id: "PRJ-001",
    name: "Safety Audit Q1 2024",
    auditor: "María Pérez",
    building: "Green Tower",
    createdISO: "2024-01-15",
  },
  {
    id: "PRJ-002",
    name: "Fire Safety Inspection",
    auditor: "Juan Gómez",
    building: "Central Park",
    createdISO: "2024-01-10",
  },
  {
    id: "PRJ-003",
    name: "Emergency Systems Check",
    auditor: "Ana Martínez",
    building: "Production Facility",
    createdISO: "2024-01-20",
  },
];

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
  const [items, setItems] = useState<ProjectRowVM[]>(SEED_ITEMS);
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

  const auditors = useMemo(() => [...AUDITOR_OPTIONS], []);
  const buildings = useMemo(() => [...BUILDING_OPTIONS], []);

  const filtered = useMemo<ProjectRowVM[]>(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.auditor.toLowerCase().includes(q) ||
        it.building.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleEdit = (id: string) => {
    const row = items.find((r) => r.id === id);
    if (!row) return;

    const auditorId = auditors.find(
      (a) => a.name.toLowerCase() === row.auditor.toLowerCase()
    )?.id;
    const buildingId = buildings.find(
      (b) => b.name.toLowerCase() === row.building.toLowerCase()
    )?.id;

    const next: {
      id: string;
      name: string;
      auditorId?: string | undefined;
      buildingId?: string | undefined;
    } = {
      id: row.id,
      name: row.name,
      ...(auditorId ? { auditorId } : {}),
      ...(buildingId ? { buildingId } : {}),
    };

    setSelectedProject(next);
    setOpenEdit(true);
  };

  const handleDelete = (id: string) => {
    const row = items.find((r) => r.id === id);
    if (!row) return;
    setProjectToDelete({ id: row.id, name: row.name });
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setItems((prev) => prev.filter((it) => it.id !== projectToDelete.id));
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
        placeholder="Search projects by Project name, Auditor, or Building..."
      >
        <ProjectsTable
          items={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </ProjectsSearchCard>

      {/* Crear */}
      <CreateProjectDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        auditors={auditors}
        buildings={buildings}
        onSubmit={async (v) => {
          const auditorName =
            auditors.find((a) => a.id === v.auditorId)?.name ?? "—";
          const buildingName =
            buildings.find((b) => b.id === v.buildingId)?.name ?? "—";
          const newRow: ProjectRowVM = {
            id: `PRJ-${String(Date.now()).slice(-6)}`,
            name: v.name,
            auditor: auditorName,
            building: buildingName,
            createdISO: new Date().toISOString().slice(0, 10),
          };
          setItems((prev) => [newRow, ...prev]);
          setOpenCreate(false);
        }}
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
          onSubmit={async (v) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === v.id
                  ? {
                      ...it,
                      name: v.name,
                      auditor:
                        auditors.find((a) => a.id === v.auditorId)?.name ??
                        it.auditor,
                      building:
                        buildings.find((b) => b.id === v.buildingId)?.name ??
                        it.building,
                    }
                  : it
              )
            );
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
