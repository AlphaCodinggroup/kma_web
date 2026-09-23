/**
 * Filtros de las auditorías del proyecto: opciones, filtrado, búsqueda y la
 * ida y vuelta con la URL.
 */
import { describe, expect, it } from "vitest";
import type { Audit } from "@entities/audit/model";
import {
  EMPTY_AUDIT_FILTERS,
  NO_FACILITY_VALUE,
  buildAuditFilterOptions,
  facilityFilterValue,
  filterProjectAudits,
  parseAuditFilters,
  sanitizeAuditFilters,
  serializeAuditFilters,
} from "../audit-filters";

const makeAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: "audit-1",
  flowId: "flow-ramps",
  flowName: "Ramps",
  version: 1,
  projectId: "project-1",
  facilityId: "f-1",
  status: "draft_report_pending_review",
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-01-16T10:30:00Z",
  projectName: "Downtown",
  auditorName: "Ada",
  facilityName: "House 1",
  findingsCount: 1,
  ...overrides,
});

const audits = [
  makeAudit({ id: "a", status: "completed" }),
  makeAudit({
    id: "b",
    facilityId: "f-2",
    facilityName: "House 2",
    flowId: "flow-doors",
    flowName: "Doors",
    auditorName: "Luis Field",
  }),
  makeAudit({ id: "c", facilityId: null, facilityName: null, status: "draft_report_in_review" }),
];

const ids = (list: Audit[]) => list.map((audit) => audit.id);
const noFilters = { facility: "", flow: "", status: "" };

describe("buildAuditFilterOptions", () => {
  const options = buildAuditFilterOptions(
    [
      { facilityId: "f-1", name: "House 1" },
      { facilityId: null, name: "No facility" },
    ],
    [...audits, makeAudit({ id: "d", flowId: "flow-x", flowName: null })]
  );

  it("offers the tree facilities in their order", () => {
    expect(options.facilities).toEqual([
      { value: "f-1", label: "House 1" },
      { value: NO_FACILITY_VALUE, label: "No facility" },
    ]);
  });

  it("offers each flow once, by name, falling back to its id", () => {
    expect(options.flows).toEqual([
      { value: "flow-doors", label: "Doors" },
      { value: "flow-x", label: "flow-x" },
      { value: "flow-ramps", label: "Ramps" },
    ]);
  });

  it("offers the four audit statuses", () => {
    expect(options.statuses.map((option) => option.value)).toEqual([
      "draft_report_pending_review",
      "draft_report_in_review",
      "final_report_sent_to_client",
      "completed",
    ]);
  });

  it("skips audits without a flow", () => {
    const { flows } = buildAuditFilterOptions([], [makeAudit({ flowId: "" })]);
    expect(flows).toEqual([]);
  });
});

describe("filterProjectAudits", () => {
  it("returns everything without filters", () => {
    expect(ids(filterProjectAudits(audits, noFilters, ""))).toEqual(["a", "b", "c"]);
  });

  it.each([
    ["facility", { ...noFilters, facility: "f-2" }, ["b"]],
    ["the audits without facility", { ...noFilters, facility: NO_FACILITY_VALUE }, ["c"]],
    ["flow", { ...noFilters, flow: "flow-doors" }, ["b"]],
    ["status", { ...noFilters, status: "completed" }, ["a"]],
    ["facility and status", { ...noFilters, facility: "f-1", status: "completed" }, ["a"]],
    ["filters that exclude each other", { ...noFilters, flow: "flow-doors", status: "completed" }, []],
  ])("filters by %s", (_label, filters, expected) => {
    expect(ids(filterProjectAudits(audits, filters, ""))).toEqual(expected);
  });

  it.each([
    ["the auditor", "field", ["b"]],
    ["the flow", "doors", ["b"]],
    ["the facility", "house 1", ["a"]],
    ["the status label", "in review", ["c"]],
  ])("searches %s", (_label, query, expected) => {
    expect(ids(filterProjectAudits(audits, noFilters, query))).toEqual(expected);
  });

  it("combines the search with the filters", () => {
    expect(ids(filterProjectAudits(audits, { ...noFilters, status: "completed" }, "ada"))).toEqual(["a"]);
  });
});

describe("facilityFilterValue", () => {
  it.each([
    ["f-1", "f-1"],
    [null, NO_FACILITY_VALUE],
    ["", NO_FACILITY_VALUE],
  ])("maps %j to %j", (facilityId, expected) => {
    expect(facilityFilterValue(facilityId)).toBe(expected);
  });
});

describe("sanitizeAuditFilters", () => {
  it("drops the values that are not among the options", () => {
    const options = buildAuditFilterOptions([{ facilityId: "f-1", name: "House 1" }], audits);

    expect(
      sanitizeAuditFilters(
        { query: "ramp", facility: "gone", flow: "flow-doors", status: "bogus" },
        options
      )
    ).toEqual({ query: "ramp", facility: "", flow: "flow-doors", status: "" });
  });
});

describe("url round trip", () => {
  it("reads the filters from the url", () => {
    expect(
      parseAuditFilters(new URLSearchParams("q=ramp&facility=f-1&flow=flow-doors&status=completed"))
    ).toEqual({ query: "ramp", facility: "f-1", flow: "flow-doors", status: "completed" });
  });

  it("reads missing params as no filter", () => {
    expect(parseAuditFilters(new URLSearchParams(""))).toEqual(EMPTY_AUDIT_FILTERS);
  });

  it("writes only the active filters, trimming the search", () => {
    expect(
      serializeAuditFilters({ query: "  main st ", facility: "", flow: "", status: "completed" })
    ).toBe("q=main+st&status=completed");
  });

  it("writes nothing without filters", () => {
    expect(serializeAuditFilters({ ...EMPTY_AUDIT_FILTERS, query: "   " })).toBe("");
  });
});
