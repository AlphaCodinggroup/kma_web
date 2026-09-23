/**
 * Vista previa del reporte: estructura del PDF (barra, columnas, filas y
 * total), fotos que no se imprimen, y edición en el lugar de cantidad y notas
 * con la medición bloqueada.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import ReportPreview, {
  type ReportPreviewDrafts,
  type ReportPreviewProps,
} from "../ReportPreview";

const makeFinding = (overrides: Partial<AuditFinding> = {}): AuditFinding => ({
  questionCode: "Q-1",
  answer: "NO",
  mitigationId: "MIT-1",
  barrierStatement: "Curb ramp off route",
  proposedMitigation: "Relocate ramp",
  adasReference: "405.2",
  quantity: 3,
  unitCost: 833.333,
  unitOfMeasure: "EA",
  measurements: [{ name: "Height", value: 45, unit: '"' }],
  notes: "Slippery surface",
  photos: [],
  calculatedCost: 2500,
  ...overrides,
});

function makeDrafts(overrides: Partial<ReportPreviewDrafts> = {}): ReportPreviewDrafts {
  return {
    draftOf: (code) =>
      code === "Q-1" ? { quantity: "3", notes: "Slippery surface" } : { quantity: "", notes: "" },
    setDraft: vi.fn(),
    errorOf: () => null,
    costOf: (finding) => finding.calculatedCost ?? 0,
    ...overrides,
  };
}

function renderPreview(overrides: Partial<ReportPreviewProps> = {}) {
  const props: ReportPreviewProps = {
    findings: [makeFinding()],
    facilityName: "House 2",
    location: "North entrance",
    editable: false,
    drafts: makeDrafts(),
    canComment: true,
    onAddComment: vi.fn(),
    ...overrides,
  };
  render(<ReportPreview {...props} />);
  return props;
}

describe("ReportPreview — PDF layout", () => {
  it("shows the facility bar, the PDF columns and the facility total", () => {
    renderPreview();

    expect(screen.getByText("House 2")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "#",
      "Barrier Statement",
      "Code",
      "Photo",
      "Proposed Mitigation",
      "Cost",
    ]);
    expect(screen.getByTestId("report-total")).toHaveTextContent("TOTAL FOR HOUSE 2: $2,500");
  });

  it("prints a finding like the PDF does", () => {
    renderPreview();

    const row = screen.getByTestId("report-row-Q-1");
    expect(within(row).getByText("1.")).toBeInTheDocument();
    expect(within(row).getByText("Curb ramp off route")).toBeInTheDocument();
    expect(within(row).getByText('Measurement: 45"')).toBeInTheDocument();
    expect(within(row).getByText("Location: North entrance")).toBeInTheDocument();
    expect(within(row).getByText("405.2")).toBeInTheDocument();
    expect(within(row).getByText("Relocate ramp")).toBeInTheDocument();
    expect(within(row).getByText("Quantity: 3")).toBeInTheDocument();
    expect(within(row).getByText("Unit Cost: $833.33 EA")).toBeInTheDocument();
    expect(screen.getByTestId("report-cost-Q-1")).toHaveTextContent("$2,500");
    expect(screen.getByText("Slippery surface")).toBeInTheDocument();
  });

  it("prints a dash when the mitigation is incomplete, like the PDF", () => {
    renderPreview({ findings: [makeFinding({ unitCost: null })] });

    const row = screen.getByTestId("report-row-Q-1");
    expect(within(row).getByText("-")).toBeInTheDocument();
    expect(within(row).queryByText(/Unit Cost/)).toBeNull();
  });

  it("omits the quantity line when there is none", () => {
    renderPreview({ findings: [makeFinding({ quantity: 0 })] });

    expect(screen.queryByText(/Quantity:/)).toBeNull();
    expect(screen.getByText("Unit Cost: $833.33 EA")).toBeInTheDocument();
  });

  it("shows up to three printed photos and counts the rest", () => {
    renderPreview({
      findings: [
        makeFinding({
          photos: [
            { url: "https://cdn/1.jpg", includeInReport: true },
            { url: "https://cdn/2.jpg", includeInReport: false },
            { url: "https://cdn/3.jpg", includeInReport: true },
            { url: "https://cdn/4.jpg", includeInReport: true },
            { url: "https://cdn/5.jpg", includeInReport: true },
          ],
        }),
      ],
    });

    expect(screen.getAllByRole("img", { name: /^Photo/ })).toHaveLength(3);
    expect(screen.getByText("+2 not in the report")).toBeInTheDocument();
  });

  it("says when there are no findings", () => {
    renderPreview({ findings: [] });

    expect(screen.getByText("No findings to report.")).toBeInTheDocument();
    expect(screen.getByTestId("report-total")).toHaveTextContent("$0");
  });

  it("hides the note row when there is no note to read", () => {
    renderPreview({
      drafts: makeDrafts({ draftOf: () => ({ quantity: "3", notes: "" }) }),
    });

    expect(screen.queryByText("QC note (not printed in the PDF):")).toBeNull();
  });

  it("opens the comments of a finding", async () => {
    const props = renderPreview();

    await userEvent.click(screen.getByRole("button", { name: "Comments on finding 1" }));

    expect(props.onAddComment).toHaveBeenCalledWith(props.findings[0], 0);
  });

  it("disables the comments for other roles", () => {
    renderPreview({ canComment: false });

    expect(screen.getByRole("button", { name: "Comments on finding 1" })).toBeDisabled();
  });
});

describe("ReportPreview — editing in place", () => {
  it("edits the quantity and the QC note of each finding", async () => {
    const setDraft = vi.fn();
    renderPreview({ editable: true, drafts: makeDrafts({ setDraft }) });

    await userEvent.type(screen.getByRole("spinbutton", { name: "Quantity of finding 1" }), "5");
    await userEvent.type(screen.getByRole("textbox", { name: "QC note for finding 1" }), "!");

    expect(setDraft).toHaveBeenCalledWith("Q-1", { quantity: "35" });
    expect(setDraft).toHaveBeenCalledWith("Q-1", { notes: "Slippery surface!" });
    expect(screen.getByText("QC note (not printed in the PDF):")).toBeInTheDocument();
  });

  it("locks the measurement until the backend supports it", () => {
    renderPreview({ editable: true });

    expect(
      screen.getByRole("img", { name: "Editable once the backend supports it" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: /Measurement/ })).toBeNull();
  });

  it("shows the quantity error", () => {
    renderPreview({ editable: true, drafts: makeDrafts({ errorOf: () => "Enter a quantity" }) });

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a quantity");
    expect(screen.getByRole("spinbutton", { name: "Quantity of finding 1" })).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("warns that a quantity of 0 removes the cost", () => {
    renderPreview({
      editable: true,
      drafts: makeDrafts({ draftOf: () => ({ quantity: "0", notes: "" }) }),
    });

    expect(screen.getByText("0 removes the cost")).toBeInTheDocument();
  });

  it("offers the quantity even when the backend dropped it, and shows the unit", () => {
    renderPreview({
      editable: true,
      findings: [makeFinding({ quantity: null, unitOfMeasure: "lf" })],
      drafts: makeDrafts({ draftOf: () => ({ quantity: "", notes: "" }) }),
    });

    expect(screen.getByRole("spinbutton", { name: "Quantity of finding 1" })).toHaveValue(null);
    expect(screen.getByText(/^Quantity:/).closest("label")).toHaveTextContent("Quantity:LF");
    expect(screen.getByText("Unit Cost: $833.33 LF")).toBeInTheDocument();
  });

  it("uses the live cost for the rows and the total", () => {
    renderPreview({
      findings: [makeFinding(), makeFinding({ questionCode: "Q-2" })],
      drafts: makeDrafts({ costOf: (finding) => (finding.questionCode === "Q-1" ? 1000 : 234.5) }),
    });

    expect(screen.getByTestId("report-cost-Q-1")).toHaveTextContent("$1,000");
    expect(screen.getByTestId("report-total")).toHaveTextContent("$1,234.50");
  });
});
