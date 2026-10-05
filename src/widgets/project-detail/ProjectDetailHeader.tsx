"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Download, Loader2, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@entities/projects/model";
import { ProjectStatusBadge } from "@shared/ui/badge";
import { cn } from "@shared/lib/cn";
import MetricCard from "@widgets/dashboard/MetricCard";

export interface ProjectDetailHeaderProps {
  project: Project;
  summary: { facilities: number; inProgress: number; completed: number };
  isAdmin: boolean;
  /** El proyecto tiene un reporte descargable. */
  reportAvailable: boolean;
  downloadingReport: boolean;
  onDownloadReport: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const actionClassName =
  "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** Cabecera del detalle: identidad del proyecto, resumen y acciones. */
const ProjectDetailHeader: React.FC<ProjectDetailHeaderProps> = ({
  project,
  summary,
  isAdmin,
  reportAvailable,
  downloadingReport,
  onDownloadReport,
  onEdit,
  onDelete,
}) => {
  const auditors = project.users?.map((user) => user.name).filter(Boolean) ?? [];

  return (
    <header className="space-y-4" data-testid="project-detail-header">
      <Link
        href={"/projects" as Route}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 no-underline hover:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description ? (
            <p className="text-sm text-gray-700">{project.description}</p>
          ) : null}
          <p className="text-sm text-gray-600">
            {auditors.length > 0
              ? `Auditors: ${auditors.join(", ")}`
              : "No auditors assigned"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDownloadReport}
            disabled={!reportAvailable || downloadingReport}
            title={
              reportAvailable
                ? "Download the project report"
                : "The report is available once audits are completed"
            }
            className={cn(
              actionClassName,
              "border-gray-900 bg-black text-white hover:bg-gray-800"
            )}
          >
            {downloadingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {downloadingReport ? "Downloading…" : "Download report"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={!isAdmin}
            title={!isAdmin ? "Only administrators can edit projects" : "Edit project"}
            className={cn(
              actionClassName,
              "border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
            )}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!isAdmin}
            title={!isAdmin ? "Only administrators can delete projects" : "Delete project"}
            className={cn(
              actionClassName,
              "border-red-300 bg-white text-red-600 hover:bg-red-50"
            )}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Facilities"
          value={summary.facilities}
          icon="building"
          data-testid="metric-facilities"
        />
        <MetricCard
          title="Audits in progress"
          value={summary.inProgress}
          icon="clock"
          data-testid="metric-in-progress"
        />
        <MetricCard
          title="Completed audits"
          value={summary.completed}
          icon="file-check"
          data-testid="metric-completed"
        />
      </div>
    </header>
  );
};

export default ProjectDetailHeader;
