import { describe, expect, it } from "vitest";
import { FlowDTOSchema } from "@features/flows/api/flows.dto";
import { mapFlowDTO, mapFlowToDTO } from "../mappers";

describe("Flow code preservation", () => {
  it("preserves the API code when the title or description changes", () => {
    const dto = FlowDTOSchema.parse({
      id: "qa-flow", code: "QAENDPOINT", title: "QA flow", version: 1, steps: [],
    });
    const flow = mapFlowDTO(dto);
    flow.title = "QA renamed flow";
    flow.description = "An unrelated edit";
    expect(mapFlowToDTO(flow)).toMatchObject({
      code: "QAENDPOINT", title: "QA renamed flow", description: "An unrelated edit",
    });
  });

  it("does not invent a code for legacy or new flows", () => {
    const dto = FlowDTOSchema.parse({ id: "qa-flow", title: "QA flow", version: 1, steps: [] });
    expect(mapFlowToDTO(mapFlowDTO(dto)).code).toBeUndefined();
  });
});
