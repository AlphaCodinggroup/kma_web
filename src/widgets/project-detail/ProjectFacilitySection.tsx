"use client";

import React from "react";
import type { Audit } from "@entities/audit/model";
import AuditsTable from "@features/audits/ui/AuditsTable";
import { Collapsible } from "@shared/ui/collapsible";
import type { FacilitySection } from "@widgets/project-detail/lib/project-sections";

// Dentro de una facility, el proyecto y la facility ya están dados.
const HIDDEN_COLUMNS = ["project", "facility"] as const;

export interface ProjectFacilitySectionProps {
  section: FacilitySection;
  defaultOpen?: boolean | undefined;
  /** La sección muestra sólo las auditorías que pasan los filtros. */
  filtered?: boolean | undefined;
  onOpenReview: (audit: Audit, isCompliant?: boolean) => void;
  onDeleteAudit: (audit: Audit) => void;
  editingId: string | null;
  deletingId: string | null;
  onRetry: () => void;
}

function describeSummary(
  { total, inProgress, completed }: FacilitySection["summary"],
  filtered: boolean
) {
  if (total === 0) return filtered ? "No matches" : "No audits yet";
  const audits = total === 1 ? "1 audit" : `${total} audits`;
  return `${audits} · ${inProgress} in progress · ${completed} completed`;
}

/** Una facility del proyecto, desplegable, con sus auditorías. */
const ProjectFacilitySection: React.FC<ProjectFacilitySectionProps> = ({
  section,
  defaultOpen,
  filtered = false,
  onOpenReview,
  onDeleteAudit,
  editingId,
  deletingId,
  onRetry,
}) => {
  const location = [section.address, section.city].filter(Boolean).join(" · ");

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      title={
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-semibold text-black">{section.name}</span>
          {location ? (
            <span className="text-sm text-gray-600">{location}</span>
          ) : null}
          {!section.assigned ? (
            <span className="text-xs text-amber-700">
              Not assigned to this project
            </span>
          ) : null}
        </span>
      }
      meta={describeSummary(section.summary, filtered)}
    >
      {section.audits.length > 0 ? (
        <AuditsTable
          items={section.audits}
          hiddenColumns={HIDDEN_COLUMNS}
          onEdit={onOpenReview}
          onDelete={onDeleteAudit}
          editingId={editingId}
          deletingId={deletingId}
          onError={onRetry}
        />
      ) : (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          {filtered
            ? "No audits match the filters."
            : "No audits have been started for this facility."}
        </p>
      )}
    </Collapsible>
  );
};

export default ProjectFacilitySection;
