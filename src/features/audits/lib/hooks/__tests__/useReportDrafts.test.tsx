/**
 * Borradores de la vista previa del reporte: qué cuenta como cambio, la
 * validación de la cantidad, el costo en vivo y el guardado de a un hallazgo.
 */
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AuditFinding } from "@entities/audit/model/audit-review";

const updateAuditFinding = vi.fn();
vi.mock("@features/audits/lib/usecases/updateAuditFinding", () => ({
  updateAuditFinding: (...args: unknown[]) => updateAuditFinding(...args),
}));
// La clave de la revisión vive junto al repositorio HTTP, que lee el entorno.
vi.mock("@features/audits/api/audit-review.repo.impl", () => ({
  auditReviewDetailRepo: {},
}));

import { useReportDrafts } from "../useReportDrafts";

const makeFinding = (overrides: Partial<AuditFinding> = {}): AuditFinding => ({
  questionCode: "Q-1",
  answer: "NO",
  mitigationId: "MIT-1",
  barrierStatement: "Curb ramp off route",
  proposedMitigation: "Relocate ramp",
  adasReference: "405.2",
  quantity: 3,
  unitCost: 100,
  unitOfMeasure: "EA",
  measurements: [],
  notes: "Slippery",
  photos: [],
  calculatedCost: 300,
  ...overrides,
});

const findings = [makeFinding(), makeFinding({ questionCode: "Q-2", quantity: null, notes: null })];

let client: QueryClient;

function setup(list: AuditFinding[] = findings) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useReportDrafts("audit-1", list), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient();
  vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
});

describe("useReportDrafts — changes", () => {
  it("starts from the saved values without changes", () => {
    const { result } = setup();

    expect(result.current.draftOf("Q-1")).toEqual({ quantity: "3", notes: "Slippery" });
    expect(result.current.draftOf("Q-2")).toEqual({ quantity: "", notes: "" });
    expect(result.current.draftOf("unknown")).toEqual({ quantity: "", notes: "" });
    expect(result.current.isDirty).toBe(false);
  });

  it("counts an edit as a change until it goes back to the saved value", () => {
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { quantity: "4" }));
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.setDraft("Q-1", { quantity: "3.0" }));
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.setDraft("Q-1", { notes: " Slippery " }));
    expect(result.current.isDirty).toBe(false);
  });

  it("ignores drafts of findings that are no longer in the review", () => {
    const { result } = setup();

    act(() => result.current.setDraft("gone", { quantity: "9" }));

    expect(result.current.isDirty).toBe(false);
  });

  it.each([
    ["an empty quantity", "", "Enter a quantity"],
    ["text", "abc", "Enter a number"],
    ["a negative quantity", "-2", "Quantity can't be negative"],
  ])("rejects %s", (_label, value, message) => {
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { quantity: value }));

    expect(result.current.errorOf("Q-1")).toBe(message);
    expect(result.current.hasErrors).toBe(true);
  });

  it.each(["0", "2.5"])("accepts a quantity of %s", (value) => {
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { quantity: value }));

    expect(result.current.errorOf("Q-1")).toBeNull();
  });

  it("discards every change", () => {
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { quantity: "4" }));
    act(() => result.current.discard());

    expect(result.current.isDirty).toBe(false);
    expect(result.current.draftOf("Q-1").quantity).toBe("3");
  });
});

describe("useReportDrafts — live cost", () => {
  it("keeps the saved cost without a draft", () => {
    const { result } = setup();

    expect(result.current.costOf(findings[0]!)).toBe(300);
    expect(result.current.costOf(makeFinding({ calculatedCost: null }))).toBe(0);
  });

  it("multiplies the draft quantity by the unit cost", () => {
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { quantity: "2.5" }));

    expect(result.current.costOf(findings[0]!)).toBe(250);
  });

  it.each([
    ["0", 0],
    ["", 300],
    ["abc", 300],
  ])("prints %j as a cost of %s", (value, expected) => {
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { quantity: value }));

    expect(result.current.costOf(findings[0]!)).toBe(expected);
  });

  it("prints no cost without a unit cost", () => {
    const withoutCost = makeFinding({ unitCost: null });
    const { result } = setup([withoutCost]);

    act(() => result.current.setDraft("Q-1", { quantity: "4" }));

    expect(result.current.costOf(withoutCost)).toBe(0);
  });
});

describe("useReportDrafts — save", () => {
  it("saves each changed finding in order, only with what changed", async () => {
    const calls: string[] = [];
    updateAuditFinding.mockImplementation(async (input: { questionCode: string }) => {
      calls.push(input.questionCode);
      return {};
    });
    const { result } = setup();

    act(() => {
      result.current.setDraft("Q-1", { quantity: "2.5" });
      result.current.setDraft("Q-2", { notes: "  New note " });
    });
    let saved = false;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(saved).toBe(true);
    expect(calls).toEqual(["Q-1", "Q-2"]);
    expect(updateAuditFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-1",
      quantity: 2.5,
    });
    expect(updateAuditFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-2",
      notes: "  New note ",
    });
    expect(client.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["audits", "review-detail", "audit-1"],
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it("clears a note by saving it empty", async () => {
    updateAuditFinding.mockResolvedValue({});
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { notes: "" }));
    await act(async () => {
      await result.current.save();
    });

    expect(updateAuditFinding).toHaveBeenCalledWith({
      auditId: "audit-1",
      questionCode: "Q-1",
      notes: "",
    });
  });

  it("keeps the drafts that failed and says how many", async () => {
    updateAuditFinding
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: "BAD_REQUEST", message: "Invalid status" });
    const { result } = setup();

    act(() => {
      result.current.setDraft("Q-1", { quantity: "4" });
      result.current.setDraft("Q-2", { quantity: "1" });
    });
    let saved = true;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(saved).toBe(false);
    expect(result.current.saveError).toBe("1 change could not be saved: Invalid status");
    expect(result.current.isDirty).toBe(true);
    expect(result.current.draftOf("Q-2").quantity).toBe("1");
  });

  it("reports several failures without a reason", async () => {
    updateAuditFinding.mockRejectedValue("boom");
    const { result } = setup();

    act(() => {
      result.current.setDraft("Q-1", { quantity: "4" });
      result.current.setDraft("Q-2", { quantity: "1" });
    });
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saveError).toBe("2 changes could not be saved.");
    expect(client.invalidateQueries).not.toHaveBeenCalled();
  });

  it("clears the error once the user edits again", async () => {
    updateAuditFinding.mockRejectedValue(new Error("down"));
    const { result } = setup();

    act(() => result.current.setDraft("Q-1", { quantity: "4" }));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.saveError).toBe("1 change could not be saved: down");

    act(() => result.current.setDraft("Q-1", { quantity: "5" }));
    expect(result.current.saveError).toBeNull();
  });

  it.each([
    ["nothing changed", () => {}],
    ["a field is invalid", (api: ReturnType<typeof useReportDrafts>) => api.setDraft("Q-1", { quantity: "" })],
  ])("does not save when %s", async (_label, prepare) => {
    const { result } = setup();

    act(() => prepare(result.current));
    let saved = true;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(saved).toBe(false);
    expect(updateAuditFinding).not.toHaveBeenCalled();
  });
});
