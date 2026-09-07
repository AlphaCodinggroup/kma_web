/**
 * Alta de un flow: el editor arranca con la plantilla vacía en modo create.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@shared/ui/page-header", () => ({
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));

const captured: { initialFlow?: unknown; mode?: string | undefined } = {};

vi.mock("@features/flows/ui/FlowEditor", () => ({
  FlowEditor: (props: { initialFlow: unknown; mode?: string }) => {
    captured.initialFlow = props.initialFlow;
    captured.mode = props.mode;
    return <div data-testid="editor" />;
  },
}));

describe("NewFlowPage", () => {
  it("renders the editor in create mode with the seed flow", async () => {
    const { default: NewFlowPage } = await import("../page");
    render(<NewFlowPage />);

    expect(screen.getByRole("heading", { name: "Create New Flow" })).toBeTruthy();
    expect(captured.mode).toBe("create");

    const flow = captured.initialFlow as {
      id: string;
      title: string;
      isActive: boolean;
      version: number;
      steps: Array<{ id: string; type: string; fields: Array<{ id: string }> }>;
    };
    expect(flow.id).toBe("new");
    expect(flow.title).toBe("");
    expect(flow.isActive).toBe(true);
    expect(flow.version).toBe(1);
    // La plantilla arranca con el Form de ubicación, que todos los flows tienen.
    expect(flow.steps).toHaveLength(1);
    expect(flow.steps[0]).toMatchObject({ id: "L-01", type: "Form" });
    expect(flow.steps[0].fields[0].id).toBe("location");
  });
});
