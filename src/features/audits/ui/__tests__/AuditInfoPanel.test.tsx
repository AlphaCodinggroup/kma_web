import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import AuditInfoPanel from "../AuditInfoPanel";

describe("AuditInfoPanel", () => {
  it("renders every field when all data is present", () => {
    render(
      <AuditInfoPanel
        auditDate="2026-01-15T10:30:00Z"
        completedDate="2026-02-20T18:45:00Z"
        projectName="Downtown Retrofit"
        facilityName="Warehouse 7"
        location="Buenos Aires"
        auditorName="Ada Lovelace"
        ariaLabelledById="info-heading"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Audit Information" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("audit-date")).toHaveTextContent(
      "2026-01-15 10:30"
    );
    expect(screen.getByTestId("completed-date")).toHaveTextContent(
      "2026-02-20 18:45"
    );
    expect(screen.getByTestId("project-name")).toHaveTextContent(
      "Downtown Retrofit"
    );
    expect(screen.getByTestId("facility-name")).toHaveTextContent("Warehouse 7");
    expect(screen.getByTestId("location")).toHaveTextContent("Buenos Aires");
    expect(screen.getByTestId("auditor-name")).toHaveTextContent(
      "Ada Lovelace"
    );
  });

  it("falls back to an em dash for every missing optional field", () => {
    render(<AuditInfoPanel auditDate="2026-01-15T10:30:00Z" />);

    expect(screen.getByTestId("project-name")).toHaveTextContent("—");
    expect(screen.getByTestId("facility-name")).toHaveTextContent("—");
    expect(screen.getByTestId("location")).toHaveTextContent("—");
    expect(screen.getByTestId("auditor-name")).toHaveTextContent("—");
    // formatIsoToYmdHm devuelve "-" (guión corto) para valores ausentes.
    expect(screen.getByTestId("completed-date")).toHaveTextContent("-");
  });

  it("renders the em dash fallback for null and empty optional values", () => {
    render(
      <AuditInfoPanel
        auditDate="2026-01-15T10:30:00Z"
        completedDate={null}
        projectName={null}
        facilityName=""
        location={null}
        auditorName=""
      />
    );

    expect(screen.getByTestId("project-name")).toHaveTextContent("—");
    expect(screen.getByTestId("facility-name")).toHaveTextContent("—");
    expect(screen.getByTestId("location")).toHaveTextContent("—");
    expect(screen.getByTestId("auditor-name")).toHaveTextContent("—");
  });

  it("uses the default container padding and merges extra classes", () => {
    const { container } = render(
      <AuditInfoPanel auditDate="2026-01-15T10:30:00Z" className="mt-8" />
    );

    const section = container.querySelector(
      '[data-testid="audit-info-panel"]'
    ) as HTMLElement;
    expect(section.className).toContain("px-4");
    expect(section.className).toContain("mt-8");
  });

  it("allows overriding the container padding class", () => {
    render(
      <AuditInfoPanel
        auditDate="2026-01-15T10:30:00Z"
        containerPaddingClassName="px-0"
      />
    );

    const section = screen.getByTestId("audit-info-panel");
    expect(section.className).toContain("px-0");
    expect(section.className).not.toContain("px-4");
  });

  it("formats a non-ISO audit date through the parsing fallback", () => {
    render(<AuditInfoPanel auditDate="2026-03-01" />);

    // Sin "T" el helper parsea la fecha y la normaliza a UTC.
    expect(screen.getByTestId("audit-date")).toHaveTextContent(
      "2026-03-01 00:00"
    );
  });
});
