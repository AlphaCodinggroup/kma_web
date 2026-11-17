/**
 * Página de projects & facilities: las dos pestañas y el botón de alta, que
 * delega en el contenido activo a través de un ref.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Los contenidos se stubbean registrando su callback de alta en el ref que
// recibe, que es el mecanismo que la página coordina.
vi.mock("@features/projects/ui/ProjectsContent", () => ({
  ProjectsContent: ({
    createTriggerRef,
  }: {
    createTriggerRef: { current?: () => void };
  }) => {
    createTriggerRef.current = () => {
      document.body.dataset.created = "project";
    };
    return <div>projects content</div>;
  },
}));

vi.mock("@features/facilities/ui/FacilitiesContent", () => ({
  FacilitiesContent: ({
    createTriggerRef,
  }: {
    createTriggerRef: { current?: () => void };
  }) => {
    createTriggerRef.current = () => {
      document.body.dataset.created = "facility";
    };
    return <div>facilities content</div>;
  },
}));

async function renderPage() {
  const { default: ProjectsPage } = await import("../page");
  return render(<ProjectsPage />);
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    delete document.body.dataset.created;
    window.history.replaceState(null, "", "/projects");
  });

  it("restores the facilities tab from a shared URL", async () => {
    window.history.replaceState(null, "", "/projects?tab=facilities");
    await renderPage();
    expect(screen.getByRole("button", { name: "New Facility" })).toBeTruthy();
    expect(screen.getByText("facilities content")).toBeTruthy();
  });

  it("preserves filters when saving the active tab in the URL", async () => {
    window.history.replaceState(null, "", "/projects?projects_q=north");
    await renderPage();
    await userEvent.click(screen.getByRole("tab", { name: "Facilities" }));
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("facilities");
    expect(new URLSearchParams(window.location.search).get("projects_q")).toBe("north");
  });

  it("renders the header and starts on the projects tab", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Projects" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "New Project" })).toBeTruthy();
    expect(screen.getByText("projects content")).toBeTruthy();
  });

  it("switches to the facilities tab and relabels the create button", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("tab", { name: "Facilities" }));

    expect(screen.getByRole("button", { name: "New Facility" })).toBeTruthy();
    expect(screen.getByText("facilities content")).toBeTruthy();
  });

  it("triggers the project creation while the projects tab is active", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(document.body.dataset.created).toBe("project");
  });

  it("triggers the facility creation while the facilities tab is active", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("tab", { name: "Facilities" }));
    await userEvent.click(screen.getByRole("button", { name: "New Facility" }));

    expect(document.body.dataset.created).toBe("facility");
  });
});
