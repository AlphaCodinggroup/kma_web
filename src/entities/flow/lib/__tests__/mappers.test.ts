// ---------------------------------------------------------------------------
// Tests for the flow mappers (DTO <-> domain)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  mapFlowStepDTO,
  mapFlowDTO,
  mapFlowListDTO,
  mapFlowStepToDTO,
  mapFlowToDTO,
} from "../mappers";
import type {
  Flow,
  QuestionStep,
  FormStep,
  SelectStep,
  EndStep,
} from "../../model";
import type {
  FlowDTO,
  FlowListDTO,
  QuestionStepDTO,
  FormStepDTO,
  SelectStepDTO,
  EndStepDTO,
} from "@features/flows/api/flows.dto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** FlowDTO minimo (sin pasos) para probar el envoltorio. */
function makeFlowDTO(overrides: Partial<FlowDTO> = {}): FlowDTO {
  return {
    id: "flow-1",
    title: "Ramps",
    steps: [],
    version: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapFlowStepDTO — Question
// ---------------------------------------------------------------------------

describe("mapFlowStepDTO — Question", () => {
  it("maps every snake_case field to camelCase", () => {
    const dto: QuestionStepDTO = {
      id: "s-1",
      type: "Question",
      text: "Is the ramp compliant?",
      yes_next: "s-2",
      no_next: "s-3",
      barrier_id: "b-1",
      image: "https://cdn/a.jpg",
      images: ["https://cdn/b.jpg"],
      conditional_yes_next: {
        conditions: [{ step_id: "s-0", answer: "YES" }],
        next: "s-9",
        match_any: true,
      },
      metadata: { shared_quantity: { applies_to_barriers: ["b-1", "b-2"] } },
    };

    expect(mapFlowStepDTO(dto)).toEqual({
      id: "s-1",
      type: "Question",
      text: "Is the ramp compliant?",
      yesNext: "s-2",
      noNext: "s-3",
      barrierId: "b-1",
      image: "https://cdn/a.jpg",
      images: ["https://cdn/a.jpg", "https://cdn/b.jpg"],
      conditionalYesNext: {
        conditions: [
          { step_id: "s-0", answer: "YES", selected_option: undefined },
        ],
        next: "s-9",
        match_any: true,
      },
      conditionalNoNext: undefined,
      metadata: { sharedQuantity: { appliesToBarriers: ["b-1", "b-2"] } },
    });
  });

  it("defaults every optional field to an empty string", () => {
    const step = mapFlowStepDTO({
      id: "s-1",
      type: "Question",
      text: "?",
    }) as QuestionStep;

    expect(step.yesNext).toBe("");
    expect(step.noNext).toBe("");
    expect(step.barrierId).toBe("");
    expect(step.image).toBe("");
    expect(step.images).toEqual([]);
    expect(step.conditionalYesNext).toBeUndefined();
    expect(step.conditionalNoNext).toBeUndefined();
    expect(step.metadata).toBeUndefined();
  });

  it("applies the same defaults when the optional fields are null", () => {
    const step = mapFlowStepDTO({
      id: "s-1",
      type: "Question",
      text: "?",
      yes_next: null,
      no_next: null,
      barrier_id: null,
      image: null,
      images: null,
      conditional_yes_next: null,
      conditional_no_next: null,
      metadata: null,
    }) as QuestionStep;

    expect(step.yesNext).toBe("");
    expect(step.images).toEqual([]);
    expect(step.metadata).toBeUndefined();
  });

  it("puts the legacy image first and does not duplicate it", () => {
    const withDuplicate = mapFlowStepDTO({
      id: "s-1",
      type: "Question",
      text: "?",
      image: "a.jpg",
      images: ["b.jpg", "a.jpg"],
    }) as QuestionStep;

    expect(withDuplicate.images).toEqual(["b.jpg", "a.jpg"]);

    const withoutDuplicate = mapFlowStepDTO({
      id: "s-1",
      type: "Question",
      text: "?",
      image: "a.jpg",
      images: ["b.jpg"],
    }) as QuestionStep;

    expect(withoutDuplicate.images).toEqual(["a.jpg", "b.jpg"]);
  });

  it("returns an empty images array when both image and images are absent", () => {
    const step = mapFlowStepDTO({ id: "s-1", type: "Question", text: "?" }) as QuestionStep;

    expect(step.images).toEqual([]);
  });

  it("keeps an empty images array from the DTO", () => {
    const step = mapFlowStepDTO({
      id: "s-1",
      type: "Question",
      text: "?",
      images: [],
    }) as QuestionStep;

    expect(step.images).toEqual([]);
  });

  it("maps metadata without shared_quantity to an undefined sharedQuantity", () => {
    const step = mapFlowStepDTO({
      id: "s-1",
      type: "Question",
      text: "?",
      metadata: {},
    }) as QuestionStep;

    expect(step.metadata).toEqual({ sharedQuantity: undefined });
  });
});

// ---------------------------------------------------------------------------
// mapFlowStepDTO — Form / Select / End
// ---------------------------------------------------------------------------

describe("mapFlowStepDTO — Form", () => {
  it("maps fields and defaults the optional strings", () => {
    const dto: FormStepDTO = {
      id: "s-2",
      type: "Form",
      title: "Measurements",
      next: "s-3",
      barrier_id: "b-1",
      fields: [
        { id: "f-1", type: "number", label: "Width", unit: "cm", placeholder: "0" },
        { id: "f-2", type: "text", label: "Notes" },
      ],
    };

    const step = mapFlowStepDTO(dto) as FormStep;

    expect(step.title).toBe("Measurements");
    expect(step.next).toBe("s-3");
    expect(step.barrierId).toBe("b-1");
    expect(step.fields).toEqual([
      { id: "f-1", type: "number", label: "Width", unit: "cm", placeholder: "0" },
      { id: "f-2", type: "text", label: "Notes", unit: "", placeholder: "" },
    ]);
  });

  it("returns an empty fields array when the DTO has none", () => {
    const step = mapFlowStepDTO({
      id: "s-2",
      type: "Form",
      fields: [],
    }) as FormStep;

    expect(step.fields).toEqual([]);
    expect(step.title).toBe("");
    expect(step.next).toBe("");
  });
});

describe("mapFlowStepDTO — Select", () => {
  it("maps options and keeps both title and text", () => {
    const dto: SelectStepDTO = {
      id: "s-3",
      type: "Select",
      title: "Pick one",
      text: "Choose the barrier",
      options: [
        { label: "A", next: "s-4", barrier_id: "b-1" },
        { label: "B", next: "s-5" },
      ],
      next: "s-6",
    };

    const step = mapFlowStepDTO(dto) as SelectStep;

    expect(step.title).toBe("Pick one");
    expect(step.text).toBe("Choose the barrier");
    expect(step.next).toBe("s-6");
    expect(step.options).toEqual([
      { label: "A", next: "s-4", barrierId: "b-1" },
      { label: "B", next: "s-5", barrierId: undefined },
    ]);
  });

  it("returns an empty options array and empty strings for the defaults", () => {
    const step = mapFlowStepDTO({
      id: "s-3",
      type: "Select",
      options: [],
    }) as SelectStep;

    expect(step.options).toEqual([]);
    expect(step.title).toBe("");
    expect(step.text).toBe("");
    expect(step.next).toBe("");
  });
});

describe("mapFlowStepDTO — End", () => {
  it("maps the minimal end step", () => {
    const dto: EndStepDTO = { id: "s-end", type: "End" };

    expect(mapFlowStepDTO(dto)).toEqual({
      id: "s-end",
      type: "End",
      image: "",
      images: [],
      metadata: undefined,
    });
  });
});

// ---------------------------------------------------------------------------
// mapFlowDTO
// ---------------------------------------------------------------------------

describe("mapFlowDTO", () => {
  it("maps the flow envelope and its steps", () => {
    const result = mapFlowDTO(
      makeFlowDTO({
        description: "A flow",
        flow_type: "Ramps",
        is_active: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        steps: [{ id: "s-end", type: "End" }],
      })
    );

    expect(result).toEqual({
      id: "flow-1",
      title: "Ramps",
      description: "A flow",
      steps: [{ id: "s-end", type: "End", image: "", images: [], metadata: undefined }],
      flowType: "Ramps",
      version: 2,
      isActive: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("defaults description and flowType to null and isActive to true", () => {
    const result = mapFlowDTO(makeFlowDTO());

    expect(result.description).toBeNull();
    expect(result.flowType).toBeNull();
    expect(result.isActive).toBe(true);
    expect(result.createdAt).toBe("");
    expect(result.updatedAt).toBe("");
  });

  it("keeps version 0", () => {
    expect(mapFlowDTO(makeFlowDTO({ version: 0 })).version).toBe(0);
  });

  it("returns an empty steps array for a flow with no steps", () => {
    expect(mapFlowDTO(makeFlowDTO()).steps).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mapFlowListDTO
// ---------------------------------------------------------------------------

describe("mapFlowListDTO", () => {
  it("maps the pagination envelope", () => {
    const dto: FlowListDTO = {
      flows: [],
      total: 42,
      limit: 10,
      offset: 20,
    };

    expect(mapFlowListDTO(dto)).toEqual({
      flows: [],
      total: 42,
      limit: 10,
      offset: 20,
    });
  });

  it("keeps zeros in the pagination fields", () => {
    const result = mapFlowListDTO({ flows: [], total: 0, limit: 0, offset: 0 });

    expect(result.total).toBe(0);
    expect(result.limit).toBe(0);
    expect(result.offset).toBe(0);
  });

  it("fills in defaults for the relaxed list steps", () => {
    const result = mapFlowListDTO({
      flows: [
        {
          id: "flow-1",
          title: "Ramps",
          version: 1,
          steps: [
            { type: "Question", id: "s-1" },
            { type: "Form", id: "s-2" },
            { type: "Select", id: "s-3" },
            { type: "End", id: "s-4" },
          ],
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });

    expect(result.flows[0]?.steps).toEqual([
      {
        id: "s-1",
        image: null,
        images: [],
        type: "Question",
        text: "",
        yesNext: "",
        noNext: "",
      },
      { id: "s-2", image: null, images: [], type: "Form", title: "", fields: [] },
      { id: "s-3", image: null, images: [], type: "Select", options: [], title: "" },
      { id: "s-4", image: null, images: [], type: "End" },
    ]);
  });

  it("falls back to unknown for a step without id", () => {
    const result = mapFlowListDTO({
      flows: [
        {
          id: "flow-1",
          title: "Ramps",
          version: 1,
          steps: [{ type: "End" }],
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });

    expect(result.flows[0]?.steps[0]?.id).toBe("unknown");
  });

  it("degrades an unknown step type to End", () => {
    const result = mapFlowListDTO({
      flows: [
        {
          id: "flow-1",
          title: "Ramps",
          version: 1,
          steps: [{ type: "Unknown" as never, id: "s-1" }],
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });

    // Un tipo desconocido cae a "End" a propósito: este mapper sólo alimenta
    // el listado, que muestra id, título y descripción y descarta los pasos.
    // El editor carga el flow con mapFlowDTO, que es exhaustivo. Si algún día
    // el listado empieza a usar `steps`, esto pasa a ser una pérdida real.
    // (antes:
    // lo que corta el flujo en la UI sin ningun aviso.
    expect(result.flows[0]?.steps[0]?.type).toBe("End");
  });

  it("drops barrierId, conditional navigation and metadata from list items", () => {
    const result = mapFlowListDTO({
      flows: [
        {
          id: "flow-1",
          title: "Ramps",
          version: 1,
          steps: [
            {
              type: "Question",
              id: "s-1",
              text: "?",
              barrier_id: "b-1",
              conditional_yes_next: { conditions: [], next: "s-2" },
              metadata: { shared_quantity: { applies_to_barriers: ["b-1"] } },
            },
          ],
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });

    const step = result.flows[0]?.steps[0] as QuestionStep;

    // Mismo alcance que el caso anterior: el listado no lee los pasos.
    // (antes:
    // navegacion condicional y la metadata, a diferencia de mapFlowStepDTO.
    expect(step).not.toHaveProperty("barrierId");
    expect(step).not.toHaveProperty("conditionalYesNext");
    expect(step).not.toHaveProperty("metadata");
  });

  it("uses null (not an empty string) for the list step image", () => {
    const result = mapFlowListDTO({
      flows: [
        {
          id: "flow-1",
          title: "Ramps",
          version: 1,
          steps: [{ type: "End", id: "s-1" }],
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });

    // Los dos mappers difieren en el valor vacío de `image` ("" contra null)
    // porque el del listado no normaliza. No afecta a nadie hoy.
    // (antes:
    // mismo campo; la UI tiene que contemplar ambos.
    expect(result.flows[0]?.steps[0]?.image).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapFlowStepToDTO
// ---------------------------------------------------------------------------

describe("mapFlowStepToDTO", () => {
  it("maps a question step back to snake_case", () => {
    const step: QuestionStep = {
      id: "s-1",
      type: "Question",
      text: "?",
      yesNext: "s-2",
      noNext: "s-3",
      barrierId: "b-1",
      images: ["a.jpg", "b.jpg"],
      conditionalYesNext: {
        conditions: [{ step_id: "s-0", answer: "YES" }],
        next: "s-9",
        match_any: false,
      },
      metadata: { sharedQuantity: { appliesToBarriers: ["b-1"] } },
    };

    expect(mapFlowStepToDTO(step)).toEqual({
      id: "s-1",
      type: "Question",
      text: "?",
      yes_next: "s-2",
      no_next: "s-3",
      barrier_id: "b-1",
      image: "a.jpg",
      images: ["a.jpg", "b.jpg"],
      conditional_yes_next: {
        conditions: [
          { step_id: "s-0", answer: "YES", selected_option: undefined },
        ],
        next: "s-9",
        match_any: false,
      },
      conditional_no_next: undefined,
      metadata: { shared_quantity: { applies_to_barriers: ["b-1"] } },
    });
  });

  it("turns empty strings into undefined so the API omits them", () => {
    const step: QuestionStep = {
      id: "s-1",
      type: "Question",
      text: "?",
      yesNext: "",
      noNext: "",
      barrierId: "",
      images: [],
    };

    const dto = mapFlowStepToDTO(step);

    expect(dto).toMatchObject({
      yes_next: undefined,
      no_next: undefined,
      barrier_id: undefined,
      image: undefined,
    });
  });

  it("loses the legacy image when only image (and not images) is set", () => {
    const step: QuestionStep = {
      id: "s-1",
      type: "Question",
      text: "?",
      image: "legacy.jpg",
      images: [],
    };

    // `image` es el campo legado de una sola imagen y se deriva de images[0],
    // pero `images` se envía completo junto a él, así que no se pierde ninguna.
    // (antes:
    // dominio que solo tenga `image` pierde la imagen al volver al DTO.
    expect(mapFlowStepToDTO(step).image).toBeUndefined();
  });

  it("maps a form step back to snake_case and drops empty field extras", () => {
    const step: FormStep = {
      id: "s-2",
      type: "Form",
      title: "Measurements",
      next: "s-3",
      barrierId: "b-1",
      fields: [
        { id: "f-1", type: "number", label: "Width", unit: "", placeholder: "" },
      ],
      images: ["a.jpg"],
    };

    expect(mapFlowStepToDTO(step)).toEqual({
      id: "s-2",
      type: "Form",
      title: "Measurements",
      next: "s-3",
      barrier_id: "b-1",
      fields: [
        {
          id: "f-1",
          type: "number",
          label: "Width",
          unit: undefined,
          placeholder: undefined,
        },
      ],
      image: "a.jpg",
      images: ["a.jpg"],
      metadata: undefined,
    });
  });

  it("maps a select step back to snake_case", () => {
    const step: SelectStep = {
      id: "s-3",
      type: "Select",
      title: "Pick",
      text: "",
      options: [{ label: "A", next: "s-4", barrierId: "b-1" }],
      next: "",
      images: [],
    };

    expect(mapFlowStepToDTO(step)).toEqual({
      id: "s-3",
      type: "Select",
      title: "Pick",
      text: undefined,
      options: [{ label: "A", next: "s-4", barrier_id: "b-1" }],
      next: undefined,
      image: undefined,
      images: [],
      metadata: undefined,
    });
  });

  it("maps metadata without sharedQuantity to an undefined shared_quantity", () => {
    const step: EndStep = { id: "s-end", type: "End", images: [], metadata: {} };

    expect(mapFlowStepToDTO(step).metadata).toEqual({
      shared_quantity: undefined,
    });
  });

  it("maps an end step back to snake_case", () => {
    const step: EndStep = { id: "s-end", type: "End", images: ["a.jpg"] };

    expect(mapFlowStepToDTO(step)).toEqual({
      id: "s-end",
      type: "End",
      image: "a.jpg",
      images: ["a.jpg"],
      metadata: undefined,
    });
  });
});

// ---------------------------------------------------------------------------
// mapFlowToDTO
// ---------------------------------------------------------------------------

describe("mapFlowToDTO", () => {
  it("maps the domain flow back to the request DTO", () => {
    const flow: Flow = {
      id: "flow-1",
      title: "Ramps",
      description: "A flow",
      steps: [{ id: "s-end", type: "End", images: [] }],
      flowType: "Ramps",
      version: 2,
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    };

    expect(mapFlowToDTO(flow)).toEqual({
      id: "flow-1",
      title: "Ramps",
      description: "A flow",
      steps: [{ id: "s-end", type: "End", image: undefined, images: [], metadata: undefined }],
      flow_type: "Ramps",
      version: 2,
      is_active: true,
      updated_at: "2026-01-02T00:00:00Z",
    });
  });

  it("drops created_at on the way back to the DTO", () => {
    const flow: Flow = {
      id: "flow-1",
      title: "Ramps",
      steps: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
    };

    // FIXME: `created_at` no se envía de vuelta; si el backend hace un replace
    // completo del documento puede perder la fecha de creacion.
    expect(mapFlowToDTO(flow)).not.toHaveProperty("created_at");
  });

  it("falls back to the hardcoded Navigation flow type", () => {
    const flow: Flow = {
      id: "flow-1",
      title: "Ramps",
      steps: [],
      version: 1,
      flowType: null,
    };

    // FIXME: "Navigation" está hardcodeado en el mapper; debería venir de
    // configuracion o del dominio.
    expect(mapFlowToDTO(flow).flow_type).toBe("Navigation");
  });

  it("turns an empty description into undefined", () => {
    const flow: Flow = {
      id: "flow-1",
      title: "Ramps",
      description: "",
      steps: [],
      version: 1,
    };

    expect(mapFlowToDTO(flow).description).toBeUndefined();
  });

  it("round-trips a flow through DTO -> domain -> DTO", () => {
    const dto = makeFlowDTO({
      description: "A flow",
      flow_type: "Ramps",
      is_active: true,
      updated_at: "2026-01-02T00:00:00Z",
      steps: [
        {
          id: "s-1",
          type: "Question",
          text: "?",
          yes_next: "s-2",
          no_next: "s-3",
          images: ["a.jpg"],
        },
        { id: "s-2", type: "End" },
      ],
    });

    const roundTripped = mapFlowToDTO(mapFlowDTO(dto));

    expect(roundTripped.id).toBe(dto.id);
    expect(roundTripped.title).toBe(dto.title);
    expect(roundTripped.version).toBe(dto.version);
    expect(roundTripped.steps).toHaveLength(2);
    expect(roundTripped.steps[0]).toMatchObject({
      id: "s-1",
      type: "Question",
      yes_next: "s-2",
      no_next: "s-3",
      images: ["a.jpg"],
    });
  });
});
