import type { Audit } from "@entities/audit/model";
import type { Facility } from "@entities/facility/model";
import type { Project } from "@entities/projects/model";

/** Contadores del proyecto: sólo trabajo de campo y revisión activos cuentan en curso. */
export type AuditSummary = {
  total: number;
  inProgress: number;
  completed: number;
};

/** Una facility del proyecto con sus auditorías. */
export type FacilitySection = {
  /** Id de la facility, o null para auditorías sin facility. */
  facilityId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  /** false cuando la facility sólo aparece en auditorías y no en el proyecto. */
  assigned: boolean;
  audits: Audit[];
  summary: AuditSummary;
};

export function summarizeProjectAudits(audits: readonly Audit[]): AuditSummary {
  const completed = audits.filter((audit) => audit.status === "completed").length;
  return {
    total: audits.length,
    inProgress: audits.filter(audit => audit.status === "audit_in_progress" || audit.status === "draft_report_pending_review" || audit.status === "draft_report_in_review").length,
    completed,
  };
}

const byMostRecent = (a: Audit, b: Audit) =>
  (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");

/**
 * Agrupa las auditorías del proyecto por facility.
 * - Primero las facilities del proyecto, en su orden, aunque no tengan auditorías.
 * - Después las que sólo aparecen en auditorías (p. ej. desasignadas), para no
 *   esconder ninguna auditoría.
 * - Dentro de cada sección, de la más reciente a la más antigua.
 */
export function groupAuditsByFacility(
  project: Pick<Project, "facilities">,
  audits: readonly Audit[],
  facilitiesById: ReadonlyMap<string, Pick<Facility, "address" | "city">>
): FacilitySection[] {
  const auditsByFacility = new Map<string | null, Audit[]>();
  for (const audit of audits) {
    const key = audit.facilityId || null;
    const list = auditsByFacility.get(key) ?? [];
    list.push(audit);
    auditsByFacility.set(key, list);
  }

  const buildSection = (
    facilityId: string | null,
    name: string,
    assigned: boolean
  ): FacilitySection => {
    const sectionAudits = [...(auditsByFacility.get(facilityId) ?? [])].sort(
      byMostRecent
    );
    const details = facilityId ? facilitiesById.get(facilityId) : undefined;
    return {
      facilityId,
      name,
      address: details?.address || null,
      city: details?.city || null,
      assigned,
      audits: sectionAudits,
      summary: summarizeProjectAudits(sectionAudits),
    };
  };

  const assignedIds = new Set<string>();
  const sections: FacilitySection[] = [];
  for (const facility of project.facilities ?? []) {
    if (assignedIds.has(facility.id)) continue;
    assignedIds.add(facility.id);
    sections.push(buildSection(facility.id, facility.name, true));
  }

  for (const [facilityId, facilityAudits] of auditsByFacility) {
    if (facilityId && assignedIds.has(facilityId)) continue;
    const name =
      facilityAudits.find((audit) => audit.facilityName)?.facilityName ??
      (facilityId ? "Unknown facility" : "No facility");
    sections.push(buildSection(facilityId, name, false));
  }

  return sections;
}
