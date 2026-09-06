import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ back: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: mocks.back }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import AuditEditHeader from "./AuditEditHeader";
import AuditEditTabsBar from "./AuditEditTabsBar";
import AuditInfoPanel from "./AuditInfoPanel";
import AuditQuestionsHeader from "./AuditQuestionsHeader";
import AuditsFilters from "./AuditsFilters";
import AuditsToolbar from "./AuditsToolBar";

describe("audit controls", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("renders the audit header and supports callback, href and router back navigation", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { rerender } = render(
      <AuditEditHeader
        title="Audit A"
        auditor="Alex"
        status="draft_report_pending_review"
        onBack={onBack}
        rightActions={<button>Extra action</button>}
        className="custom-header"
        containerPaddingClassName="custom-padding"
        headingId="audit-heading"
      />,
    );
    expect(screen.getByRole("heading", { name: "Audit A" })).toHaveAttribute("id", "audit-heading");
    expect(screen.getByText(/Alex/)).toBeInTheDocument();
    expect(screen.getByTestId("audit-edit-header")).toHaveClass("custom-header", "custom-padding");
    await user.click(screen.getByRole("link", { name: "Go back" }));
    expect(onBack).toHaveBeenCalledOnce();

    rerender(
      <AuditEditHeader title="Audit A" auditor="Alex" status="completed" backHref="/audits" backLabel="Audits" />,
    );
    expect(screen.getByRole("link", { name: "Audits" })).toHaveAttribute("href", "/audits");
    await user.click(screen.getByRole("link", { name: "Audits" }));
    expect(mocks.back).not.toHaveBeenCalled();

    rerender(<AuditEditHeader title="Audit A" auditor="Alex" status="completed" />);
    await user.click(screen.getByRole("link", { name: "Go back" }));
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it("changes tabs and honors disabled and labelled states", async () => {
    const user = userEvent.setup();
    const onChangeTab = vi.fn();
    const { rerender } = render(
      <AuditEditTabsBar
        activeTab="questions"
        onChangeTab={onChangeTab}
        ariaLabel="Audit sections"
        disabledTabs={{ report: true }}
        className="custom-tabs"
      />,
    );
    expect(screen.getByTestId("audit-edit-tabs")).toHaveClass("custom-tabs");
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Audit sections");
    expect(screen.getByRole("tab", { name: "Report" })).toBeDisabled();
    rerender(
      <AuditEditTabsBar activeTab="questions" onChangeTab={onChangeTab} ariaLabel="Audit sections" />,
    );
    await user.click(screen.getByRole("tab", { name: "Report" }));
    expect(onChangeTab).toHaveBeenCalledWith("report");
  });

  it("renders audit information with dates and fallbacks", () => {
    const { rerender } = render(
      <AuditInfoPanel
        auditDate="2026-01-02T10:30:00Z"
        completedDate="2026-01-03T11:30:00Z"
        projectName="Project A"
        facilityName="Facility A"
        location="Boston"
        auditorName="Alex"
        ariaLabelledById="audit-information"
        className="custom-info"
      />,
    );
    expect(screen.getByTestId("project-name")).toHaveTextContent("Project A");
    expect(screen.getByTestId("facility-name")).toHaveTextContent("Facility A");
    expect(screen.getByTestId("auditor-name")).toHaveTextContent("Alex");
    expect(screen.getByTestId("location")).toHaveTextContent("Boston");
    expect(screen.getByTestId("audit-date")).not.toBeEmptyDOMElement();
    rerender(<AuditInfoPanel auditDate="invalid" />);
    for (const id of ["project-name", "facility-name", "auditor-name", "location"]) {
      expect(screen.getByTestId(id)).toHaveTextContent("—");
    }
    expect(screen.getByTestId("completed-date")).toHaveTextContent("-");
  });

  it("shows and changes every question filter", () => {
    const onFilterChange = vi.fn();
    const { rerender } = render(
      <AuditQuestionsHeader filterMode="all" onFilterChange={onFilterChange} />,
    );
    expect(screen.getByRole("heading", { name: "All Answers" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filter questions" }), {
      target: { value: "unsure" },
    });
    expect(onFilterChange).toHaveBeenCalledWith("unsure");
    rerender(<AuditQuestionsHeader filterMode={"invalid" as never} />);
    expect(screen.getByRole("heading", { name: "All Questions" })).toBeInTheDocument();
  });

  it("changes audit filters and clears active selections", async () => {
    const user = userEvent.setup();
    const onAuditorChange = vi.fn();
    const onStatusChange = vi.fn();
    const onClearFilters = vi.fn();
    render(
      <AuditsFilters
        auditorFilter="auditor-1"
        statusFilter="completed"
        onAuditorChange={onAuditorChange}
        onStatusChange={onStatusChange}
        onClearFilters={onClearFilters}
        availableAuditors={[{ id: "auditor-1", name: "Alex" }]}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by auditor" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by audit status" }), { target: { value: "draft_report_in_review" } });
    expect(onAuditorChange).toHaveBeenCalledWith("");
    expect(onStatusChange).toHaveBeenCalledWith("draft_report_in_review");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("renders a searchable toolbar with optional filters", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <AuditsToolbar searchValue="" onSearchChange={onSearchChange} className="custom-toolbar" />,
    );
    await user.type(screen.getByPlaceholderText("Search audits…"), "ramp");
    expect(onSearchChange).toHaveBeenCalled();
    expect(screen.queryByRole("combobox", { name: "Filter by auditor" })).not.toBeInTheDocument();

    rerender(
      <AuditsToolbar
        searchValue="ramp"
        onSearchChange={onSearchChange}
        searchPlaceholder="Find an audit"
        onAuditorFilterChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Find an audit")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by auditor" })).toBeInTheDocument();
  });
});
