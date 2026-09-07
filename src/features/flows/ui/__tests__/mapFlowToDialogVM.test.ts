import { describe, it, expect } from "vitest";
import type { Flow, FlowStep } from "@entities/flow/model";
import { mapFlowToDialogVM } from "../adapters/mapFlowToDialogVM";

// Construye un Flow mínimo de dominio para el adapter.
function makeFlow(steps: FlowStep[], overrides: Partial<Flow> = {}): Flow {
  return {
    id: "AR",
    title: "Ramps",
    description: "Ramp audit",
    steps,
    version: 1,
    ...overrides,
  };
}

describe("mapFlowToDialogVM", () => {
  it("maps title and description straight through", () => {
    const vm = mapFlowToDialogVM(makeFlow([]));

    expect(vm.title).toBe("Ramps");
    expect(vm.description).toBe("Ramp audit");
    expect(vm.questions).toEqual([]);
  });

  it("falls back to an empty description when the flow has none", () => {
    const vm = mapFlowToDialogVM(makeFlow([], { description: null }));

    expect(vm.description).toBe("");
  });

  it("maps a Question step to a yes_no question", () => {
    const vm = mapFlowToDialogVM(
      makeFlow([
        { id: "AR-Q01", type: "Question", text: "Is the ramp compliant?" },
      ])
    );

    expect(vm.questions).toEqual([
      { id: "AR-Q01", text: "Is the ramp compliant?", type: "yes_no" },
    ]);
  });

  it("maps a Select step to a multiple_choice question with option labels", () => {
    const vm = mapFlowToDialogVM(
      makeFlow([
        {
          id: "AR-S01",
          type: "Select",
          title: "Pick a surface",
          options: [
            { label: "Concrete", next: "AR-Q01" },
            { label: "Asphalt", next: "AR-Q02" },
          ],
        },
      ])
    );

    expect(vm.questions).toEqual([
      {
        id: "AR-S01",
        text: "Pick a surface",
        type: "multiple_choice",
        options: ["Concrete", "Asphalt"],
      },
    ]);
  });

  it("uses text when a Select step has no title", () => {
    const vm = mapFlowToDialogVM(
      makeFlow([
        { id: "AR-S01", type: "Select", text: "Only text", options: [] },
      ])
    );

    expect(vm.questions[0]?.text).toBe("Only text");
  });

  it("uses a default label when a Select step has neither title nor text", () => {
    const vm = mapFlowToDialogVM(
      makeFlow([{ id: "AR-S01", type: "Select", options: [] }])
    );

    expect(vm.questions[0]?.text).toBe("Select an option");
  });

  it("skips Form steps by default", () => {
    const vm = mapFlowToDialogVM(
      makeFlow([{ id: "AR-F01", type: "Form", title: "Measurements", fields: [] }])
    );

    expect(vm.questions).toEqual([]);
  });

  it("includes Form steps as text_input when includeForms is true", () => {
    const vm = mapFlowToDialogVM(
      makeFlow([{ id: "AR-F01", type: "Form", title: "Measurements", fields: [] }]),
      { includeForms: true }
    );

    expect(vm.questions).toEqual([
      { id: "AR-F01", text: "Measurements", type: "text_input" },
    ]);
  });

  it("never renders End steps", () => {
    const vm = mapFlowToDialogVM(
      makeFlow(
        [
          { id: "AR-Q01", type: "Question", text: "Q" },
          { id: "AR-E01", type: "End" },
        ],
        {}
      ),
      { includeForms: true }
    );

    expect(vm.questions.map((q) => q.id)).toEqual(["AR-Q01"]);
  });

  it("preserves the order of the source steps", () => {
    const vm = mapFlowToDialogVM(
      makeFlow([
        { id: "AR-S01", type: "Select", title: "S", options: [] },
        { id: "AR-Q01", type: "Question", text: "Q" },
        { id: "AR-F01", type: "Form", title: "F", fields: [] },
      ]),
      { includeForms: true }
    );

    expect(vm.questions.map((q) => q.id)).toEqual([
      "AR-S01",
      "AR-Q01",
      "AR-F01",
    ]);
  });
});
