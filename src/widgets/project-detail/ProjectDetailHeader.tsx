"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@entities/projects/model";
import { ProjectStatusBadge } from "@shared/ui/badge";
import { Button } from "@shared/ui/controls";

export interface ProjectDetailHeaderProps {
  project: Project;
  summary: { facilities: number; inProgress: number; completed: number; delivered?: number; unavailable?: number };
  isAdmin: boolean;
  /** El proyecto tiene un reporte descargable. */
  reportAvailable: boolean;
  downloadingReport: boolean;
  onDownloadReport: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

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
    <header className="space-y-5" data-testid="project-detail-header">
      <Link
        href={"/projects" as Route}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--kma-muted)] no-underline hover:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--kma-border)] pb-6">
        <div className="min-w-0 flex-1 basis-80 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="kma-page-title break-words [overflow-wrap:anywhere]">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description ? (
            <p className="text-sm text-[var(--kma-muted)]">{project.description}</p>
          ) : null}
          <p className="text-sm text-[var(--kma-muted)]">
            {auditors.length > 0
              ? `Auditors: ${auditors.join(", ")}`
              : "No auditors assigned"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            fullWidth={false}
            isLoading={downloadingReport}
            loadingLabel="Downloading…"
            onClick={onDownloadReport}
            disabled={!reportAvailable || downloadingReport}
            title={
              reportAvailable
                ? "Download the project report"
                : "The report is available once audits are completed"
            }
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download report
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            onClick={onEdit}
            disabled={!isAdmin}
            title={!isAdmin ? "Only administrators can edit projects" : "Edit project"}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            fullWidth={false}
            onClick={onDelete}
            disabled={!isAdmin}
            title={!isAdmin ? "Only administrators can delete projects" : "Delete project"}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] sm:grid-cols-3 lg:flex lg:flex-wrap">
        {[
          { label: "Facilities", value: summary.facilities, testId: "metric-facilities" },
          { label: "Audits in progress", value: summary.inProgress, testId: "metric-in-progress" },
          { label: "Completed audits", value: summary.completed, testId: "metric-completed" },
          ...(summary.delivered ? [{ label: "Delivered audits", value: summary.delivered, testId: "metric-delivered" }] : []),
          ...(summary.unavailable ? [{ label: "Status unavailable", value: summary.unavailable, testId: "metric-unavailable" }] : []),
        ].map(({ label, value, testId }) => (
          <div key={testId} data-testid={testId} className="min-w-0 border-b border-r border-[var(--kma-border)] p-4 last:border-r-0 lg:flex-1 lg:border-b-0">
            <dt className="text-sm text-[var(--kma-muted)]">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
};

export default ProjectDetailHeader;
