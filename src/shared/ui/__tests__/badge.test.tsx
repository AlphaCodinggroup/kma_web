import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Badge,
  StatusBadge,
  ProjectStatusBadge,
  AUDIT_STATUS_LABELS,
} from "../badge";
import type { AuditStatus } from "@entities/audit/model";
import type { ProjectStatus } from "@entities/projects/model";

describe("Badge", () => {
  it("renders its children inside a span", () => {
    render(<Badge>Ready</Badge>);
    const badge = screen.getByText("Ready");
    expect(badge.tagName).toBe("SPAN");
  });

  it("applies the shared base classes", () => {
    render(<Badge>Base</Badge>);
    expect(screen.getByText("Base")).toHaveClass(
      "inline-flex",
      "items-center",
      "rounded-full",
      "font-medium",
      "leading-5"
    );
  });

  // Matriz completa variante x tono: cada celda del toneMap del componente.
  const paletteCases: Array<{
    variant: "solid" | "soft" | "outline";
    tone: "neutral" | "success" | "warning" | "danger" | "info";
    expected: string;
  }> = [
    { variant: "solid", tone: "neutral", expected: "bg-gray-900" },
    { variant: "solid", tone: "success", expected: "bg-emerald-600" },
    { variant: "solid", tone: "warning", expected: "bg-amber-600" },
    { variant: "solid", tone: "danger", expected: "bg-red-600" },
    { variant: "solid", tone: "info", expected: "bg-sky-600" },
    { variant: "soft", tone: "neutral", expected: "bg-gray-100" },
    { variant: "soft", tone: "success", expected: "bg-emerald-50" },
    { variant: "soft", tone: "warning", expected: "bg-amber-50" },
    { variant: "soft", tone: "danger", expected: "bg-red-50" },
    { variant: "soft", tone: "info", expected: "bg-sky-50" },
    { variant: "outline", tone: "neutral", expected: "text-gray-700" },
    { variant: "outline", tone: "success", expected: "text-emerald-700" },
    { variant: "outline", tone: "warning", expected: "text-amber-800" },
    { variant: "outline", tone: "danger", expected: "text-red-700" },
    { variant: "outline", tone: "info", expected: "text-sky-700" },
  ];

  it.each(paletteCases)(
    "applies the $variant/$tone palette",
    ({ variant, tone, expected }) => {
      render(
        <Badge variant={variant} tone={tone}>
          Palette
        </Badge>
      );
      expect(screen.getByText("Palette")).toHaveClass(expected);
    }
  );

  const sizeCases: Array<{ size: "sm" | "md"; expected: string[] }> = [
    { size: "sm", expected: ["px-2.5", "py-0.5", "text-[11px]"] },
    { size: "md", expected: ["px-3", "py-1", "text-xs"] },
  ];

  it.each(sizeCases)("applies the $size size classes", ({ size, expected }) => {
    render(<Badge size={size}>Sized</Badge>);
    expect(screen.getByText("Sized")).toHaveClass(...expected);
  });

  it("defaults to the soft/neutral/sm combination", () => {
    render(<Badge>Defaults</Badge>);
    const badge = screen.getByText("Defaults");
    expect(badge).toHaveClass("bg-gray-100", "px-2.5", "text-[11px]");
  });

  it("appends a custom className", () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    expect(screen.getByText("Custom")).toHaveClass("custom-badge", "bg-gray-100");
  });

  it("forwards extra span props to the DOM node", () => {
    render(
      <Badge id="badge-id" title="badge title" data-testid="badge-extra">
        Extra
      </Badge>
    );
    const badge = screen.getByTestId("badge-extra");
    expect(badge).toHaveAttribute("id", "badge-id");
    expect(badge).toHaveAttribute("title", "badge title");
  });

  it("forwards the ref to the underlying span", () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toHaveTextContent("Ref");
  });

  it("exposes a displayName", () => {
    expect(Badge.displayName).toBe("Badge");
  });
});

describe("StatusBadge", () => {
  const statuses: AuditStatus[] = [
    "draft_report_pending_review",
    "draft_report_in_review",
    "final_report_sent_to_client",
    "completed",
  ];

  it.each(statuses)("renders the human label for %s", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(AUDIT_STATUS_LABELS[status])).toBeInTheDocument();
  });

  it("uses the solid variant when the status is completed", () => {
    render(<StatusBadge status="completed" />);
    // solid + neutral => bg-gray-900
    expect(screen.getByText("Completed")).toHaveClass("bg-gray-900");
  });

  it("uses the soft variant for any non completed status", () => {
    render(<StatusBadge status="draft_report_in_review" />);
    expect(screen.getByText("Draft Report In Review")).toHaveClass("bg-gray-100");
  });

  it("always adds the tracking-tight class and merges a custom className", () => {
    render(<StatusBadge status="completed" className="extra-status" />);
    const badge = screen.getByText("Completed");
    expect(badge).toHaveClass("tracking-tight", "extra-status");
  });

  it("forwards the remaining props such as size and data attributes", () => {
    render(
      <StatusBadge status="completed" size="md" data-testid="status-badge" />
    );
    expect(screen.getByTestId("status-badge")).toHaveClass("px-3", "py-1");
  });
});

describe("ProjectStatusBadge", () => {
  const projectStatuses: Array<{
    status: ProjectStatus;
    label: string;
    tone: string;
    variant: string;
  }> = [
    // ACTIVE => tono success + variante soft por defecto
    { status: "ACTIVE", label: "Active", tone: "bg-emerald-50", variant: "soft" },
    // ARCHIVED => tono neutral + variante outline por defecto
    {
      status: "ARCHIVED",
      label: "Archived",
      tone: "text-gray-700",
      variant: "outline",
    },
  ];

  it.each(projectStatuses)(
    "renders $status with its default $variant variant",
    ({ status, label, tone }) => {
      render(<ProjectStatusBadge status={status} />);
      expect(screen.getByText(label)).toHaveClass(tone, "tracking-tight");
    }
  );

  it("honours an explicit variant over the status derived default", () => {
    render(<ProjectStatusBadge status="ACTIVE" variant="solid" />);
    expect(screen.getByText("Active")).toHaveClass("bg-emerald-600");
  });

  it("honours an explicit size", () => {
    render(<ProjectStatusBadge status="ARCHIVED" size="md" />);
    expect(screen.getByText("Archived")).toHaveClass("px-3", "py-1");
  });

  it("merges a custom className and forwards extra props", () => {
    render(
      <ProjectStatusBadge
        status="ACTIVE"
        className="project-extra"
        data-testid="project-badge"
      />
    );
    const badge = screen.getByTestId("project-badge");
    expect(badge).toHaveClass("project-extra");
  });
});
