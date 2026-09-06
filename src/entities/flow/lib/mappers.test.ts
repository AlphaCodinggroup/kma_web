import { describe, expect, it } from "vitest";
import type { Flow, FlowStep } from "../model";
import { mapFlowDTO, mapFlowListDTO, mapFlowStepDTO, mapFlowStepToDTO, mapFlowToDTO } from "./mappers";

describe("flow step mappers (DTO to domain)", () => {
  it("fills every question field and both conditional paths", () => {
    const step = mapFlowStepDTO({
      id: "Q1",
      type: "Question",
      text: "Is it accessible?",
      yes_next: "F1",
      no_next: "E1",
      barrier_id: "BQ",
      image: "https://cdn.example/legacy.png",
      images: ["https://cdn.example/second.png"],
      conditional_yes_next: {
        next: "F1",
        match_any: true,
        conditions: [{ step_id: "S1", selected_option: "Lobby" }],
      },
      conditional_no_next: {
        next: "E1",
        match_any: false,
        conditions: [{ step_id: "Q0", answer: "NO" }],
      },
      metadata: { shared_quantity: { applies_to_barriers: ["BQ", "BS"] } },
    } as never);

    expect(step).toMatchObject({
      type: "Question",
      yesNext: "F1",
      noNext: "E1",
      barrierId: "BQ",
      images: ["https://cdn.example/legacy.png", "https://cdn.example/second.png"],
      metadata: { sharedQuantity: { appliesToBarriers: ["BQ", "BS"] } },
    });
    expect(step).toMatchObject({
      conditionalYesNext: {
        next: "F1",
        match_any: true,
        conditions: [{ step_id: "S1", answer: undefined, selected_option: "Lobby" }],
      },
      conditionalNoNext: { conditions: [{ step_id: "Q0", answer: "NO" }] },
    });
  });

  it("defaults every optional question field", () => {
    const step = mapFlowStepDTO({ id: "Q1", type: "Question", text: "" } as never);

    expect(step).toMatchObject({
      yesNext: "",
      noNext: "",
      barrierId: "",
      image: "",
      images: [],
      conditionalYesNext: undefined,
      conditionalNoNext: undefined,
      metadata: undefined,
    });
  });

  it("never duplicates the legacy image", () => {
    const step = mapFlowStepDTO({
      id: "E1",
      type: "End",
      image: "https://cdn.example/only.png",
      images: ["https://cdn.example/only.png"],
    } as never);

    expect(step.images).toEqual(["https://cdn.example/only.png"]);
  });

  it("maps a form with its fields and defaults", () => {
    const step = mapFlowStepDTO({
      id: "F1",
      type: "Form",
      title: "Record",
      next: "E1",
      barrier_id: "BF",
      fields: [
        { id: "width", type: "number", label: "Width", unit: "cm", placeholder: "cm" },
        { id: "notes", type: "text", label: "Notes" },
      ],
      metadata: {},
    } as never);

    expect(step).toMatchObject({
      type: "Form",
      title: "Record",
      next: "E1",
      barrierId: "BF",
      images: [],
      metadata: { sharedQuantity: undefined },
    });
    expect(step).toMatchObject({
      fields: [
        { id: "width", unit: "cm", placeholder: "cm" },
        { id: "notes", unit: "", placeholder: "" },
      ],
    });
  });

  it("defaults every optional form field", () => {
    expect(mapFlowStepDTO({ id: "F1", type: "Form", fields: [] } as never)).toMatchObject({
      title: "",
      next: "",
      barrierId: "",
      image: "",
    });
  });

  it("maps a select with and without its optional fields", () => {
    expect(
      mapFlowStepDTO({
        id: "S1",
        type: "Select",
        title: "Choose",
        text: "Choose area",
        next: "Q1",
        options: [
          { label: "Lobby", next: "Q1", barrier_id: "BS" },
          { label: "Stairs", next: "Q2" },
        ],
      } as never),
    ).toMatchObject({
      type: "Select",
      title: "Choose",
      text: "Choose area",
      next: "Q1",
      options: [
        { label: "Lobby", next: "Q1", barrierId: "BS" },
        { label: "Stairs", next: "Q2", barrierId: undefined },
      ],
    });

    expect(mapFlowStepDTO({ id: "S1", type: "Select", options: [] } as never)).toMatchObject({
      title: "",
      text: "",
      next: "",
      image: "",
    });
  });

  it("maps an end step", () => {
    expect(mapFlowStepDTO({ id: "E1", type: "End" } as never)).toEqual({
      id: "E1",
      type: "End",
      image: "",
      images: [],
      metadata: undefined,
    });
  });
});

describe("mapFlowDTO", () => {
  it("copies every field of a complete flow", () => {
    const flow = mapFlowDTO({
      id: "flow-1",
      title: "Accessibility",
      description: "Checks",
      flow_type: "Navigation",
      version: 3,
      is_active: false,
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-02T10:00:00Z",
      steps: [{ id: "E1", type: "End" }],
    } as never);

    expect(flow).toMatchObject({
      id: "flow-1",
      description: "Checks",
      flowType: "Navigation",
      version: 3,
      isActive: false,
      createdAt: "2026-09-01T10:00:00Z",
      updatedAt: "2026-09-02T10:00:00Z",
    });
    expect(flow.steps).toHaveLength(1);
  });

  it("defaults the optional flow fields", () => {
    expect(mapFlowDTO({ id: "flow-1", title: "T", version: 1, steps: [] } as never)).toMatchObject({
      description: null,
      flowType: null,
      isActive: true,
      createdAt: "",
      updatedAt: "",
    });
  });
});

describe("mapFlowListDTO", () => {
  it("rebuilds every step type with safe defaults", () => {
    const list = mapFlowListDTO({
      total: 1,
      limit: 10,
      offset: 0,
      flows: [
        {
          id: "flow-1",
          title: "Accessibility",
          version: 1,
          steps: [
            { type: "Question" },
            { type: "Form" },
            { type: "Select" },
            { type: "End", id: "E1" },
            { type: "Mystery", id: "X1" },
          ],
        },
      ],
    } as never);

    const [flow] = list.flows;
    expect(list).toMatchObject({ total: 1, limit: 10, offset: 0 });
    expect(flow.steps.map((step) => step.type)).toEqual(["Question", "Form", "Select", "End", "End"]);
    expect(flow.steps[0]).toMatchObject({ id: "unknown", text: "", yesNext: "", noNext: "", image: null });
    expect(flow.steps[1]).toMatchObject({ title: "", fields: [] });
    expect(flow.steps[2]).toMatchObject({ title: "", options: [] });
    expect(flow).toMatchObject({ description: null, flowType: null, isActive: true });
  });

  it("keeps the values the listing already carries", () => {
    const list = mapFlowListDTO({
      total: 1,
      limit: 10,
      offset: 0,
      flows: [
        {
          id: "flow-1",
          title: "Accessibility",
          description: "Checks",
          flow_type: "Navigation",
          version: 2,
          is_active: false,
          created_at: "2026-09-01T10:00:00Z",
          updated_at: "2026-09-02T10:00:00Z",
          steps: [
            {
              type: "Question",
              id: "Q1",
              text: "Ok?",
              yes_next: "F1",
              no_next: "E1",
              image: "https://cdn.example/a.png",
            },
            { type: "Form", id: "F1", title: "Record", fields: [{ id: "q", type: "number", label: "Q" }] },
            { type: "Select", id: "S1", title: "Pick", options: [{ label: "Lobby", next: "Q1" }] },
          ],
        },
      ],
    } as never);

    const [flow] = list.flows;
    expect(flow).toMatchObject({
      description: "Checks",
      flowType: "Navigation",
      isActive: false,
      createdAt: "2026-09-01T10:00:00Z",
      updatedAt: "2026-09-02T10:00:00Z",
    });
    expect(flow.steps[0]).toMatchObject({ id: "Q1", yesNext: "F1", images: ["https://cdn.example/a.png"] });
    expect(flow.steps[1]).toMatchObject({ title: "Record" });
    expect(flow.steps[2]).toMatchObject({ title: "Pick" });
  });
});

describe("flow step mappers (domain to DTO)", () => {
  it("drops the empty question fields and keeps the conditionals", () => {
    const dto = mapFlowStepToDTO({
      id: "Q1",
      type: "Question",
      text: "Ok?",
      yesNext: "",
      noNext: "E1",
      barrierId: "",
      images: ["https://cdn.example/a.png", "https://cdn.example/b.png"],
      conditionalYesNext: {
        next: "F1",
        match_any: false,
        conditions: [{ step_id: "S1", selected_option: "Lobby" }],
      },
      metadata: { sharedQuantity: { appliesToBarriers: ["BQ"] } },
    } as FlowStep);

    expect(dto).toMatchObject({
      yes_next: undefined,
      no_next: "E1",
      barrier_id: undefined,
      image: "https://cdn.example/a.png",
      images: ["https://cdn.example/a.png", "https://cdn.example/b.png"],
      metadata: { shared_quantity: { applies_to_barriers: ["BQ"] } },
    });
    expect(dto).toMatchObject({
      conditional_yes_next: { next: "F1", conditions: [{ step_id: "S1", selected_option: "Lobby" }] },
      conditional_no_next: undefined,
    });
  });

  it("leaves the image out when the question has none", () => {
    const dto = mapFlowStepToDTO({
      id: "Q1",
      type: "Question",
      text: "Ok?",
      yesNext: "F1",
      noNext: "E1",
      images: [],
      metadata: undefined,
    } as FlowStep);

    expect(dto).toMatchObject({ image: undefined, images: [], metadata: undefined });
  });

  it("drops the empty form and field values", () => {
    const dto = mapFlowStepToDTO({
      id: "F1",
      type: "Form",
      title: "Record",
      next: "",
      barrierId: "",
      fields: [
        { id: "width", type: "number", label: "Width", unit: "cm", placeholder: "cm" },
        { id: "notes", type: "text", label: "Notes", unit: "", placeholder: "" },
      ],
      metadata: { sharedQuantity: undefined },
    } as FlowStep);

    expect(dto).toMatchObject({
      next: undefined,
      barrier_id: undefined,
      image: undefined,
      metadata: { shared_quantity: undefined },
    });
    expect(dto).toMatchObject({
      fields: [
        { id: "width", unit: "cm", placeholder: "cm" },
        { id: "notes", unit: undefined, placeholder: undefined },
      ],
    });
  });

  it("drops the empty select values", () => {
    expect(
      mapFlowStepToDTO({
        id: "S1",
        type: "Select",
        title: "",
        text: "",
        next: "",
        options: [{ label: "Lobby", next: "Q1", barrierId: "BS" }],
      } as FlowStep),
    ).toMatchObject({
      title: undefined,
      text: undefined,
      next: undefined,
      image: undefined,
      images: undefined,
      options: [{ label: "Lobby", next: "Q1", barrier_id: "BS" }],
    });
  });

  it("maps an end step with and without images", () => {
    expect(mapFlowStepToDTO({ id: "E1", type: "End", images: ["a"] } as FlowStep)).toMatchObject({
      image: "a",
      images: ["a"],
    });
    expect(mapFlowStepToDTO({ id: "E1", type: "End" } as FlowStep)).toMatchObject({
      image: undefined,
      images: undefined,
    });
  });
});

describe("mapFlowToDTO", () => {
  const flow: Flow = {
    id: "flow-1",
    title: "Accessibility",
    description: "Checks",
    flowType: "Audit",
    version: 2,
    isActive: true,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-02T10:00:00Z",
    steps: [{ id: "E1", type: "End" }],
  };

  it("keeps the values the flow already carries", () => {
    expect(mapFlowToDTO(flow)).toMatchObject({
      description: "Checks",
      flow_type: "Audit",
      version: 2,
      is_active: true,
      updated_at: "2026-09-02T10:00:00Z",
    });
  });

  it("falls back to the navigation type and drops the empty description", () => {
    expect(mapFlowToDTO({ ...flow, description: null, flowType: null })).toMatchObject({
      description: undefined,
      flow_type: "Navigation",
    });
  });
});
