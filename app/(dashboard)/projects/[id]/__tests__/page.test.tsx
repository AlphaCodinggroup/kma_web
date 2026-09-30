/**
 * Página del detalle de proyecto: toma el id de la ruta y delega en la vista.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => useParams(),
}));
vi.mock("@widgets/project-detail/ProjectDetailView", () => ({
  default: ({ projectId }: { projectId: string }) => (
    <div data-testid="view">{projectId}</div>
  ),
}));

async function renderPage() {
  const { default: Page } = await import("../page");
  return render(<Page />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProjectDetailPage", () => {
  it("passes the project id from the route", async () => {
    useParams.mockReturnValue({ id: "project-1" });

    await renderPage();

    expect(screen.getByTestId("view").textContent).toBe("project-1");
  });

  it.each([
    ["no params", null],
    ["a catch-all array", { id: ["a", "b"] }],
  ])("passes an empty id with %s", async (_label, params) => {
    useParams.mockReturnValue(params);

    await renderPage();

    expect(screen.getByTestId("view").textContent).toBe("");
  });
});
