/**
 * Cabecera del detalle de proyecto: identidad, resumen, reporte y acciones con
 * los permisos de administrador.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "@entities/projects/model";
import ProjectDetailHeader, {
  type ProjectDetailHeaderProps,
} from "../ProjectDetailHeader";

const project: Project = {
  id: "project-1",
  name: "Boston Apartments",
  description: "Accessibility review",
  status: "ACTIVE",
  users: [
    { id: "u-1", name: "Ada" },
    { id: "u-2", name: "Luis" },
  ],
  facilities: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  createdBy: "user-1",
};

function renderHeader(overrides: Partial<ProjectDetailHeaderProps> = {}) {
  const props: ProjectDetailHeaderProps = {
    project,
    summary: { facilities: 3, inProgress: 2, completed: 10 },
    isAdmin: true,
    reportAvailable: true,
    downloadingReport: false,
    onDownloadReport: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<ProjectDetailHeader {...props} />);
  return props;
}

describe("ProjectDetailHeader", () => {
  it("shows the project, its status, auditors and a way back", () => {
    renderHeader();

    expect(
      screen.getByRole("heading", { name: "Boston Apartments" })
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Accessibility review")).toBeInTheDocument();
    expect(screen.getByText("Auditors: Ada, Luis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects"
    );
  });

  it("says when no auditor is assigned and skips an empty description", () => {
    renderHeader({ project: { ...project, users: [], description: "" } });

    expect(screen.getByText("No auditors assigned")).toBeInTheDocument();
    expect(screen.queryByText("Accessibility review")).toBeNull();
  });

  it("shows the three summary numbers", () => {
    renderHeader();

    expect(screen.getByTestId("metric-facilities")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-in-progress")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-completed")).toHaveTextContent("10");
  });

  it("downloads the report when there is one", async () => {
    const props = renderHeader();

    await userEvent.click(screen.getByRole("button", { name: "Download report" }));

    expect(props.onDownloadReport).toHaveBeenCalledTimes(1);
  });

  it("explains why the report cannot be downloaded yet", () => {
    renderHeader({ reportAvailable: false });

    const button = screen.getByRole("button", { name: "Download report" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute(
      "title",
      "The report is available once audits are completed"
    );
  });

  it("shows the download in progress", () => {
    renderHeader({ downloadingReport: true });

    expect(screen.getByRole("button", { name: "Downloading…" })).toBeDisabled();
  });

  it("lets an administrator edit and delete", async () => {
    const props = renderHeader();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it("disables editing and deleting for other roles", () => {
    renderHeader({ isAdmin: false });

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute(
      "title",
      "Only administrators can delete projects"
    );
  });
});
