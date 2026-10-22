"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import useProjectAudits from "@features/audits/lib/hooks/useProjectAudits";

export interface ProjectAuditsProgressProps {
  projectId: string;
}

/**
 * Auditorías completadas sobre el total del proyecto ("12/12 ✅").
 * Usa la misma consulta del detalle del proyecto, así que comparte caché.
 */
export const ProjectAuditsProgress: React.FC<ProjectAuditsProgressProps> = ({
  projectId,
}) => {
  const { audits, isLoading, isError } = useProjectAudits(projectId);

  if (isLoading) {
    return (
      <span className="text-[var(--kma-muted)]" aria-label="Loading audits">
        …
      </span>
    );
  }

  if (isError) {
    return (
      <span className="text-[var(--kma-muted)]" title="Could not load the audits">
        —
      </span>
    );
  }

  const total = audits.length;
  const completed = audits.filter((audit) => audit.status === "completed").length;
  const allCompleted = total > 0 && completed === total;

  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span>
        {completed}/{total}
      </span>
      {allCompleted ? (
        <CheckCircle2
          className="h-4 w-4 text-[var(--kma-success)]"
          aria-label="All audits completed"
        />
      ) : null}
    </span>
  );
};

export default ProjectAuditsProgress;
