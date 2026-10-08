/**
 * Secciones del detalle de proyecto: una por facility, en el orden del
 * proyecto, sin esconder auditorías de facilities que ya no están asignadas.
 */
import { describe, expect, it } from "vitest";
import type { Audit } from "@entities/audit/model";
import type { Facility } from "@entities/facility/model";
import {
  groupAuditsByFacility,
  summarizeProjectAudits,
} from "../project-sections";

const makeAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  flowId: "flow-1",
  flowName: "Ramps",
  version: 1,
  projectId: "project-1",
  facilityId: "facility-1",
  status: "draft_report_pending_review",
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-01-16T10:30:00Z",
  projectName: "Downtown",
  auditorName: "Ada",
  facilityName: "House 1",
  findingsCount: 2,
  ...overrides,
});

const project = {
  facilities: [
    { id: "facility-1", name: "House 1" },
    { id: "facility-2", name: "House 2" },
  ],
};

const facilitiesById = new Map<string, Pick<Facility, "address" | "city">>([
  ["facility-1", { address: "12 Main St", city: "Boston" }],
  ["facility-2", { city: "Salem" }],
]);

describe("summarizeProjectAudits", () => {
  it("counts only active fieldwork and review states as in progress", () => {
    expect(
      summarizeProjectAudits([
        makeAudit({ status: "draft_report_pending_review" }),
        makeAudit({ status: "draft_report_in_review" }),
        makeAudit({ status: "final_report_sent_to_client" }),
        makeAudit({ status: "completed" }),
        makeAudit({ status: "audit_in_progress" }),
        makeAudit({ status: "deleted" }),
        makeAudit({ status: "unknown" }),
      ])
    ).toEqual({ total: 7, inProgress: 3, completed: 1 });
  });

  it("returns zeros for no audits", () => {
    expect(summarizeProjectAudits([])).toEqual({
      total: 0,
      inProgress: 0,
      completed: 0,
    });
  });
});

describe("groupAuditsByFacility", () => {
  it("keeps the project order and lists facilities without audits", () => {
    const sections = groupAuditsByFacility(
      project,
      [makeAudit({ facilityId: "facility-2", facilityName: "House 2" })],
      facilitiesById
    );

    expect(sections.map((s) => [s.facilityId, s.audits.length])).toEqual([
      ["facility-1", 0],
      ["facility-2", 1],
    ]);
  });

  it("takes the address and city from the facilities list", () => {
    const [first, second] = groupAuditsByFacility(project, [], facilitiesById);

    expect(first).toMatchObject({ address: "12 Main St", city: "Boston", assigned: true });
    expect(second).toMatchObject({ address: null, city: "Salem" });
  });

  it("sorts each section from the most recent audit", () => {
    const [section] = groupAuditsByFacility(
      project,
      [
        makeAudit({ id: "old", updatedAt: "2026-01-01T00:00:00Z" }),
        makeAudit({ id: "new", updatedAt: "2026-03-01T00:00:00Z" }),
      ],
      facilitiesById
    );

    expect(section?.audits.map((a) => a.id)).toEqual(["new", "old"]);
    expect(section?.summary).toEqual({ total: 2, inProgress: 2, completed: 0 });
  });

  it("appends facilities that only appear in audits, flagged as not assigned", () => {
    const sections = groupAuditsByFacility(
      project,
      [makeAudit({ facilityId: "facility-9", facilityName: "Old Depot" })],
      facilitiesById
    );

    expect(sections).toHaveLength(3);
    expect(sections[2]).toMatchObject({
      facilityId: "facility-9",
      name: "Old Depot",
      assigned: false,
      address: null,
      city: null,
    });
  });

  it("groups audits without a facility under one section", () => {
    const sections = groupAuditsByFacility(
      { facilities: [] },
      [
        makeAudit({ id: "a", facilityId: null, facilityName: null }),
        makeAudit({ id: "b", facilityId: "", facilityName: null }),
      ],
      facilitiesById
    );

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ facilityId: null, name: "No facility" });
    expect(sections[0]?.audits).toHaveLength(2);
  });

  it("names an unknown facility when no audit carries its name", () => {
    const [section] = groupAuditsByFacility(
      { facilities: [] },
      [makeAudit({ facilityId: "facility-9", facilityName: null })],
      facilitiesById
    );

    expect(section?.name).toBe("Unknown facility");
  });

  it("lists a facility repeated in the project only once", () => {
    const sections = groupAuditsByFacility(
      { facilities: [project.facilities[0]!, project.facilities[0]!] },
      [],
      facilitiesById
    );

    expect(sections).toHaveLength(1);
  });
});
