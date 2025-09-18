"use client";

import React, { useMemo, useState } from "react";
import PageHeader from "@shared/ui/page-header";
import {
  ProjectsTable,
  type ProjectRowVM,
} from "@features/projects/ui/ProjectsTable";
import ProjectsSearchCard from "@features/projects/ui/ProjectsSearchCard";

const MOCK_ITEMS: ProjectRowVM[] = [
  {
    id: "PRJ-001",
    name: "Safety Audit Q1 2024",
    auditor: "Maria Garcia",
    building: "Main Office Building",
    createdISO: "2024-01-15",
  },
  {
    id: "PRJ-002",
    name: "Fire Safety Inspection",
    auditor: "Carlos Lopez",
    building: "Warehouse A",
    createdISO: "2024-01-10",
  },
  {
    id: "PRJ-003",
    name: "Emergency Systems Check",
    auditor: "Ana Martinez",
    building: "Production Facility",
    createdISO: "2024-01-20",
  },
];

const ProjectsPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects Management"
        subtitle="Manage audit projects and assignments"
        verticalAlign="center"
        primaryAction={{
          label: "New Project",
          onClick: () => {},
        }}
      />

      <ProjectsSearchCard
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search projects by Project name, Auditor, or Building..."
      >
        <ProjectsTable items={filtered} onEdit={() => {}} onDelete={() => {}} />
      </ProjectsSearchCard>
    </div>
  );
};
export default ProjectsPage;
