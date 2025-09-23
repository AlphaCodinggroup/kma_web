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

const MOCK_ITEMS: ProjectRowVM[] = [
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
  const [query, setQuery] = useState<string>("");
  const [openCreate, setOpenCreate] = useState<boolean>(false);
  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
    auditorId?: string | undefined;
    buildingId?: string | undefined;
  } | null>(null);

  const auditors = useMemo(() => [...AUDITOR_OPTIONS], []);
  const buildings = useMemo(() => [...BUILDING_OPTIONS], []);

  const filtered = useMemo<ProjectRowVM[]>(() => {
    if (!query.trim()) return MOCK_ITEMS;
    const q = query.toLowerCase();
    return MOCK_ITEMS.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.auditor.toLowerCase().includes(q) ||
        it.building.toLowerCase().includes(q)
    );
  }, [query]);

  const handleEdit = (id: string) => {
    const row = MOCK_ITEMS.find((r) => r.id === id);
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
          onDelete={() => {}}
        />
      </ProjectsSearchCard>

      {/* Crear */}
      <CreateProjectDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        auditors={auditors}
        buildings={buildings}
        onSubmit={async (v) => {
          console.log("create:", v);
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
          project={selectedProject}
          auditors={auditors}
          buildings={buildings}
          onSubmit={async (v) => {
            console.log("update:", v);
            setOpenEdit(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
