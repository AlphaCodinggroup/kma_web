import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditFinding } from "@entities/audit/model/audit-review";

const mocks = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@processes/auth/hooks", () => ({
  useSession: () => ({ isAdmin: mocks.isAdmin }),
}));

import ReportItemsTable from "./ReportItemsTable";

const baseFinding: AuditFinding = {
  questionCode: "Q1",
  answer: "NO",
  barrierStatement: "Door is too narrow",
  proposedMitigation: "Widen the door",
  adasReference: "  ADA 404.2  ",
  quantity: 1,
  cost: 100,
  totalCost: 100,
  calculatedCost: 125,
  notes: null,
  photos: [
    "https://images.example/1.png",
    "invalid-url",
    "https://images.example/2.png",
    "https://images.example/3.png",
    "https://images.example/4.png",
  ],
  includeInReport: true,
};

describe("ReportItemsTable", () => {
  beforeEach(() => {
    mocks.isAdmin = true;
  });
  afterEach(() => cleanup());

  it("renders findings, valid photos, costs and admin actions", async () => {
    const user = userEvent.setup();
    const onAddComment = vi.fn();
    const onEditFinding = vi.fn();
    render(
      <ReportItemsTable
        items={[baseFinding, { ...baseFinding, questionCode: "Q2", calculatedCost: Number.POSITIVE_INFINITY, adasReference: "", proposedMitigation: null, photos: [] }]}
        onAddComment={onAddComment}
        onEditFinding={onEditFinding}
        className="custom-table"
      />,
    );
    expect(screen.getByText("ADA 404.2")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 2 items");
    expect(screen.getByText("Grand Total: 125")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByText("+1 more")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Edit finding" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Comments" })[0]);
    expect(onEditFinding).toHaveBeenCalledWith(baseFinding, 0);
    expect(onAddComment).toHaveBeenCalledWith(baseFinding, 0);

    await user.click(screen.getAllByRole("button", { name: "Hide image" })[0]);
    expect(screen.getByText("Image hidden")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show image" }));
    expect(screen.queryByText("Image hidden")).not.toBeInTheDocument();
  });

  it("accepts legacy photo objects and rejects invalid URLs", () => {
    const legacy = {
      ...baseFinding,
      photos: [
        { url: "https://images.example/legacy.png" },
        { url: "ftp://invalid.example/file" },
        null,
      ],
    } as unknown as AuditFinding;
    render(<ReportItemsTable items={[legacy]} onAddComment={vi.fn()} />);
    expect(screen.getByRole("img", { name: "photo-1" })).toHaveAttribute(
      "src",
      "https://images.example/legacy.png",
    );
  });

  it("prevents viewers from editing findings or comments", () => {
    mocks.isAdmin = false;
    render(<ReportItemsTable items={[baseFinding]} onAddComment={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Edit finding" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit finding" })).toHaveAttribute(
      "title",
      "Only administrators can edit findings",
    );
    expect(screen.getByRole("button", { name: "Comments" })).toBeDisabled();
  });

  it("renders loading, retryable error and empty states", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const { rerender } = render(
      <ReportItemsTable items={[]} onAddComment={vi.fn()} loading />,
    );
    expect(screen.getByText("Loading audits…")).toBeInTheDocument();
    rerender(
      <ReportItemsTable items={[]} onAddComment={vi.fn()} error onError={onError} />,
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onError).toHaveBeenCalledOnce();
    rerender(<ReportItemsTable items={[]} onAddComment={vi.fn()} />);
    expect(screen.getByText("No report items available.")).toBeInTheDocument();
  });
});
