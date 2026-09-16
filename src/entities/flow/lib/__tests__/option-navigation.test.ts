import { describe, expect, it } from "vitest";
import { FlowDTOSchema } from "@features/flows/api/flows.dto";
import { mapFlowDTO, mapFlowToDTO } from "../mappers";

describe("Select option navigation round trip", () => {
  it.each([
    { step_id: "Q1", answer: "YES" },
    { step_id: "S0", selected_option: "Exterior" },
  ])("preserves option conditions and branches: %j", (condition) => {
    const option = {
      label: "Option A", next: "END", barrier_id: "B1",
      yes_next: "Q2", no_next: "END", condition,
    };
    const dto = FlowDTOSchema.parse({
      id: "qa-flow", title: "QA flow", version: 1,
      steps: [{ id: "S1", type: "Select", title: "Choose", options: [option] }],
    });
    const flow = mapFlowDTO(dto);
    flow.description = "An unrelated edit";
    const saved = mapFlowToDTO(flow);
    expect(saved.steps[0]).toMatchObject({ options: [option] });
  });

  it("accepts options without conditional navigation", () => {
    const dto = FlowDTOSchema.parse({
      id: "qa-flow", title: "QA flow", version: 1,
      steps: [{ id: "S1", type: "Select", options: [{ label: "A", next: "END" }] }],
    });
    expect(mapFlowToDTO(mapFlowDTO(dto)).steps[0]).toMatchObject({
      options: [{ label: "A", next: "END" }],
    });
  });
});
