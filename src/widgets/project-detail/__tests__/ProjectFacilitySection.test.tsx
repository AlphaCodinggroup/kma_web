/**
 * Sección de una facility: encabezado con ubicación y contadores, y la tabla
 * de auditorías sin las columnas que el contexto ya fija.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Audit } from "@entities/audit/model";
import type { FacilitySection } from "../lib/project-sections";

const auditsTableProps = vi.fn();

vi.mock("@features/audits/ui/AuditsTable", () => ({
  default: (props: Record<string, unknown>) => {
    auditsTableProps(props);
    return <div data-testid="audits-table" />;
  },
}));

import ProjectFacilitySection, {
  type ProjectFacilitySectionProps,
} from "../ProjectFacilitySection";

const audit = { id: "audit-1" } as Audit;

const makeSection = (overrides: Partial<FacilitySection> = {}): FacilitySection => ({
  facilityId: "facility-1",
  name: "House 1",
  address: "12 Main St",
  city: "Boston",
  assigned: true,
  audits: [audit],
  summary: { total: 1, inProgress: 1, completed: 0 },
  ...overrides,
});

function renderSection(overrides: Partial<ProjectFacilitySectionProps> = {}) {
  const props: ProjectFacilitySectionProps = {
    section: makeSection(),
    defaultOpen: true,
    onOpenReview: vi.fn(),
    onDeleteAudit: vi.fn(),
    editingId: null,
    deletingId: null,
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<ProjectFacilitySection {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProjectFacilitySection", () => {
  it("names the facility with its location and counts", () => {
    renderSection({
      section: makeSection({ summary: { total: 3, inProgress: 1, completed: 2 } }),
    });

    const toggle = screen.getByRole("button", { name: /House 1/ });
    expect(toggle).toHaveTextContent("12 Main St · Boston");
    expect(toggle).toHaveTextContent("3 audits · 1 in progress · 2 completed");
    expect(toggle).not.toHaveTextContent("Not assigned");
  });

  it("uses the singular for one audit and skips a missing location", () => {
    renderSection({ section: makeSection({ address: null, city: null }) });

    const toggle = screen.getByRole("button", { name: /House 1/ });
    expect(toggle).toHaveTextContent("1 audit · 1 in progress · 0 completed");
    expect(toggle).not.toHaveTextContent("Main St");
  });

  it("flags a facility that is no longer assigned to the project", () => {
    renderSection({ section: makeSection({ assigned: false }) });

    expect(screen.getByText("Not assigned to this project")).toBeInTheDocument();
  });

  it("lists the audits without the project and facility columns", async () => {
    const props = renderSection({ editingId: "audit-1", deletingId: "audit-2" });

    expect(auditsTableProps).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [audit],
        hiddenColumns: ["project", "facility"],
        onEdit: props.onOpenReview,
        onDelete: props.onDeleteAudit,
        editingId: "audit-1",
        deletingId: "audit-2",
        onError: props.onRetry,
      })
    );
  });

  it("says when the facility has no audits yet", () => {
    renderSection({
      section: makeSection({
        audits: [],
        summary: { total: 0, inProgress: 0, completed: 0 },
      }),
    });

    expect(screen.getByRole("button", { name: /House 1/ })).toHaveTextContent(
      "No audits yet"
    );
    expect(
      screen.getByText("No audits have been started for this facility.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("audits-table")).toBeNull();
  });

  it("mounts the audits only once opened", async () => {
    renderSection({ defaultOpen: false });

    expect(screen.queryByTestId("audits-table")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /House 1/ }));
    expect(screen.getByTestId("audits-table")).toBeInTheDocument();
  });
});
