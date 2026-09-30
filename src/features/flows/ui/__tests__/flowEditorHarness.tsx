// ---------------------------------------------------------------------------
// Utilidades compartidas por los tests de FlowEditor.
//
// Este archivo NO es un test (vitest sólo toma *.test.tsx): concentra fixtures
// de dominio, el render con QueryClientProvider y consultas de DOM reutilizables.
// El editor no asocia sus <label> con los controles, así que la estrategia es
// ubicar la fila del formulario por el texto del label y consultar por rol
// dentro de esa fila.
// ---------------------------------------------------------------------------

import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import type {
  Flow,
  FormStep,
  QuestionStep,
  SelectStep,
  EndStep,
} from "@entities/flow/model";
import { FlowEditor } from "../FlowEditor";

// ---------------------------------------------------------------------------
// Fixtures de dominio
// ---------------------------------------------------------------------------

/** Flow vacío tal como llega en la pantalla de creación (id "new"). */
export function makeNewFlow(): Flow {
  return {
    id: "new",
    title: "",
    description: "",
    steps: [],
    version: 1,
  };
}

export function makeQuestionStep(
  overrides: Partial<QuestionStep> = {}
): QuestionStep {
  return {
    id: "AR-Q01",
    type: "Question",
    text: "Is the ramp compliant?",
    yesNext: "AR-F01",
    noNext: "AR-E01",
    image: null,
    images: [],
    ...overrides,
  };
}

export function makeSelectStep(overrides: Partial<SelectStep> = {}): SelectStep {
  return {
    id: "AR-S01",
    type: "Select",
    title: "Choose the barrier",
    text: "Choose the barrier",
    options: [{ label: "Door", next: "AR-Q01", barrierId: "AR-B02" }],
    image: null,
    images: [],
    ...overrides,
  };
}

export function makeFormStep(overrides: Partial<FormStep> = {}): FormStep {
  return {
    id: "AR-F01",
    type: "Form",
    title: "Record quantity",
    next: "AR-E01",
    fields: [{ id: "quantity", type: "number", label: "Quantity" }],
    image: null,
    images: [],
    ...overrides,
  };
}

export function makeEndStep(overrides: Partial<EndStep> = {}): EndStep {
  return { id: "AR-E01", type: "End", image: null, images: [], ...overrides };
}

/**
 * Flow existente y válido: Select -> Question -> Form -> End.
 * Pasa `validateFlow` sin errores, así que sirve de base para los tests de guardado.
 */
export function makeValidFlow(): Flow {
  return {
    id: "AR",
    title: "Ramps",
    description: "Ramp audit flow",
    flowType: "Ramps",
    version: 3,
    isActive: true,
    steps: [makeSelectStep(), makeQuestionStep(), makeFormStep(), makeEndStep()],
  };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderEditor(initialFlow: Flow, mode?: "create" | "edit") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  const invalidateQueries = vi.spyOn(client, "invalidateQueries");

  // `exactOptionalPropertyTypes` impide pasar `mode={undefined}`.
  const view = render(
    <QueryClientProvider client={client}>
      {mode ? (
        <FlowEditor initialFlow={initialFlow} mode={mode} />
      ) : (
        <FlowEditor initialFlow={initialFlow} />
      )}
    </QueryClientProvider>
  );

  return { ...view, client, invalidateQueries };
}

// ---------------------------------------------------------------------------
// Consultas de DOM
// ---------------------------------------------------------------------------

/** Fila del formulario (grid label + control) identificada por el texto del label. */
export function fieldRow(labelText: string | RegExp): HTMLElement {
  const label = screen.getByText(labelText, { selector: "label" });
  const parent = label.parentElement;
  if (!parent) throw new Error(`No row found for label: ${String(labelText)}`);
  return parent as HTMLElement;
}

/** Control de texto (input/textarea) de una fila. */
export function textboxIn(labelText: string | RegExp): HTMLElement {
  return within(fieldRow(labelText)).getByRole("textbox");
}

/** <select> de una fila. */
export function comboboxIn(labelText: string | RegExp): HTMLElement {
  return within(fieldRow(labelText)).getByRole("combobox");
}

/** Bloques de opciones del paso Select, en orden de render. */
export function optionBlocks(): HTMLElement[] {
  const container = fieldRow("Options").lastElementChild;
  if (!container) throw new Error("Options container not found");
  return Array.from(container.children).filter(
    (el): el is HTMLElement => el.tagName === "DIV"
  );
}

/** Bloques de campos del paso Form, en orden de render. */
export function fieldBlocks(): HTMLElement[] {
  const container = fieldRow("Fields").lastElementChild?.lastElementChild;
  if (!container) throw new Error("Fields container not found");
  return Array.from(container.children).filter(
    (el): el is HTMLElement => el.tagName === "DIV"
  );
}

/**
 * Botón de borrado (sólo icono, sin nombre accesible) de un bloque:
 * siempre es el último botón del bloque.
 */
export function lastButtonIn(block: HTMLElement): HTMLElement {
  const buttons = within(block).getAllByRole("button");
  const last = buttons[buttons.length - 1];
  if (!last) throw new Error("No buttons found in block");
  return last;
}

/** Columna izquierda del editor (buscador + lista de pasos + botones de alta). */
export function sidebar(): HTMLElement {
  const panel = screen
    .getByPlaceholderText("Search steps...")
    .closest("div.w-80");
  if (!panel) throw new Error("Sidebar not found");
  return panel as HTMLElement;
}

/** Tarjeta del sidebar de un paso, por su id. */
export function sidebarCard(stepId: string): HTMLElement {
  const idLabel = within(sidebar()).getByText(stepId, {
    selector: "span.font-bold",
  });
  const card = idLabel.closest("div.p-3");
  if (!card) throw new Error(`Sidebar card not found for ${stepId}`);
  return card as HTMLElement;
}

/** Ids de los pasos listados en el sidebar, en orden. */
export function sidebarOrder(): string[] {
  return within(sidebar())
    .queryAllByText(/^[A-Za-z]+-[A-Za-z0-9_]+$/, {
      selector: "span.font-bold",
    })
    .map((el) => el.textContent ?? "");
}

// -- Navegación condicional ------------------------------------------------

/** Fila de un editor de navegación condicional ("YES" o "NO"). */
export function conditionalRow(branch: "YES" | "NO"): HTMLElement {
  return fieldRow(`Conditional ${branch} Navigation`);
}

/** Checkbox que habilita/deshabilita la navegación condicional. */
export function conditionalToggle(branch: "YES" | "NO"): HTMLElement {
  const toggle = within(conditionalRow(branch)).getAllByRole("checkbox")[0];
  if (!toggle) throw new Error(`No toggle for conditional ${branch}`);
  return toggle;
}

/** Panel desplegado del editor condicional (null si está colapsado). */
export function conditionalPanel(branch: "YES" | "NO"): HTMLElement | null {
  return conditionalRow(branch).querySelector("div.p-4");
}

function requirePanel(branch: "YES" | "NO"): HTMLElement {
  const panel = conditionalPanel(branch);
  if (!panel) throw new Error(`Conditional ${branch} panel is not expanded`);
  return panel;
}

/** Select del paso destino cuando las condiciones se cumplen. */
export function conditionalTarget(branch: "YES" | "NO"): HTMLElement {
  const target = within(requirePanel(branch)).getAllByRole("combobox")[0];
  if (!target) throw new Error(`No target select for conditional ${branch}`);
  return target;
}

/** Bloques de condiciones del panel, en orden. */
export function conditionBlocks(branch: "YES" | "NO"): HTMLElement[] {
  return Array.from(
    requirePanel(branch).querySelectorAll<HTMLElement>("div.bg-white")
  );
}

/** Selects de una condición: [paso, respuesta u opción]. */
export function conditionSelects(
  branch: "YES" | "NO",
  index: number
): HTMLElement[] {
  const block = conditionBlocks(branch)[index];
  if (!block) throw new Error(`No condition block at index ${index}`);
  return within(block).getAllByRole("combobox");
}

/**
 * Menú "Create & link" que despliega un botón Create: se acota al contenedor
 * del botón porque los nombres de tipo también existen en el sidebar.
 */
export function createMenuItem(
  createButton: HTMLElement,
  type: "Question" | "Form" | "Select" | "End"
): HTMLElement {
  const wrapper = createButton.parentElement;
  if (!wrapper) throw new Error("Create menu wrapper not found");
  return within(wrapper as HTMLElement).getByRole("button", { name: type });
}

export function queryCreateMenuItem(
  createButton: HTMLElement,
  type: "Question" | "Form" | "Select" | "End"
): HTMLElement | null {
  const wrapper = createButton.parentElement;
  if (!wrapper) throw new Error("Create menu wrapper not found");
  return within(wrapper as HTMLElement).queryByRole("button", { name: type });
}

/** Modal abierto (Modal expone role="dialog"). */
export function openDialog(): HTMLElement {
  return screen.getByRole("dialog");
}

// ---------------------------------------------------------------------------
// DataTransfer mínimo para los eventos de drag & drop
// ---------------------------------------------------------------------------

export function createDataTransfer() {
  const store = new Map<string, string>();
  return {
    effectAllowed: "",
    dropEffect: "",
    setData: (format: string, value: string) => {
      store.set(format, value);
    },
    getData: (format: string) => store.get(format) ?? "",
  };
}
