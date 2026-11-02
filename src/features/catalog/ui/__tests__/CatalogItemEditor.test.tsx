import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogItemEditor from "../CatalogItemEditor";
const row = { catalog_item_id: "B1#01", flow_id: "FLOW", barrier_id: "B1", question_code: "01", question: "Safe?", mitigation_id: "M1", barrier_statement: "Steps", proposed_mitigation: "Ramp", adas_reference: "ADA", cost: 0, unit: "each" };
const common = { version: "v1", revision: "r1", busy: false, result: null, error: null, onClose: vi.fn() };
describe("Mitigation editor", () => {
  it("preserves the original row identity while changing keys and keeps a zero cost", async () => {
    const save = vi.fn().mockResolvedValue("op1");
    const user = userEvent.setup();
    render(<CatalogItemEditor {...common} selected={{ kind: "update", item: row }} onSave={save} />);
    await user.clear(screen.getByLabelText("Question code"));
    await user.type(screen.getByLabelText("Question code"), "02");
    await user.click(screen.getByRole("button", { name: "Save mitigation" }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ kind: "update", base_version: "v1", expected_revision: "r1", target: { flow_id: "FLOW", catalog_item_id: "B1#01" }, item: expect.objectContaining({ question_code: "02", cost: 0 }) }));
  });
  it("retains values after failure and requires explicit review before using a newer revision", async () => {
    const save = vi.fn().mockResolvedValue("op1");
    const user = userEvent.setup();
    const props = { ...common, selected: { kind: "update" as const, item: row }, onSave: save };
    const { rerender } = render(<CatalogItemEditor {...props} />);
    await user.clear(screen.getByLabelText("Cost"));
    await user.click(screen.getByRole("button", { name: "Save mitigation" }));
    expect(save.mock.calls[0][0].item.cost).toBeNull();
    rerender(<CatalogItemEditor {...props} revision="r2" version="v2" error="Catalog changed" result={{ operation_id: "op1", kind: "update", status: "conflict", message: "Catalog changed" }} />);
    expect(screen.getByLabelText("Cost")).toHaveValue(null);
    expect(screen.getByLabelText("Mitigation")).toHaveValue("Ramp");
    expect(screen.getByRole("button", { name: "Save mitigation" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Use current catalog" }));
    await user.click(screen.getByRole("button", { name: "Save mitigation" }));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ base_version: "v2", expected_revision: "r2" }));
    rerender(<CatalogItemEditor {...props} revision="r2" version="v2" result={{ operation_id: "op1", kind: "update", status: "completed", message: "Saved" }} />);
    await waitFor(() => expect(common.onClose).toHaveBeenCalled());
  });
  it("deletes only after confirmation and sends no other mitigation content", async () => {
    const save = vi.fn().mockResolvedValue("delete1");
    const user = userEvent.setup();
    render(<CatalogItemEditor {...common} selected={{ kind: "delete", item: row }} onSave={save} />);
    expect(save).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete mitigation" }));
    expect(save).toHaveBeenCalledWith({ kind: "delete", target: { flow_id: "FLOW", catalog_item_id: "B1#01" }, base_version: "v1", expected_revision: "r1" });
  });
});
