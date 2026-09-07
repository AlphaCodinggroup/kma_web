/**
 * Edición de una auditoría: resuelve params y searchParams (que en Next 15
 * pueden llegar como promesa o resueltos), y arma los datos de cabecera y del
 * panel con sus valores por defecto.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuditDetail = vi.fn();

vi.mock("@features/audits/lib/hooks/useAuditDetail", () => ({
  useAuditDetail: (...args: unknown[]) => useAuditDetail(...args),
}));

vi.mock("@shared/ui/Retry", () => ({
  Retry: ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button onClick={onClick}>{text}</button>
  ),
}));

vi.mock("@features/audits/ui/AuditEditHeader", () => ({
  default: (props: Record<string, unknown>) => (
    <header data-testid="header">{JSON.stringify(props)}</header>
  ),
}));

vi.mock("@features/audits/ui/AuditInfoPanel", () => ({
  default: (props: Record<string, unknown>) => (
    <section data-testid="panel">{JSON.stringify(props)}</section>
  ),
}));

vi.mock("@features/audits/ui/AuditEditContent", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="content">{JSON.stringify(props)}</div>
  ),
}));

/** Detalle completo, como lo devuelve el backend. */
function makeDetail(overrides: Record<string, unknown> = {}) {
  return {
    flowName: "Curb ramps",
    status: "final_report_sent_to_client",
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-01-16T11:00:00Z",
    projectName: "Proyecto Norte",
    facilityName: "Planta",
    location: "Front entry",
    auditorName: "detail-auditor",
    ...overrides,
  };
}

function stubDetail(overrides: Record<string, unknown> = {}) {
  const refetch = vi.fn();
  useAuditDetail.mockReturnValue({
    data: makeDetail(),
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  });
  return refetch;
}

/** Lee los props serializados por uno de los stubs. */
function propsOf(testId: string) {
  return JSON.parse(screen.getByTestId(testId).textContent ?? "{}");
}

/** params y searchParams, resueltos o como promesa, igual que los pasa Next. */
type Params = { id: string } | Promise<{ id: string }>;
type Search = { auditor?: string } | Promise<{ auditor?: string }>;

// searchParams se omite cuando no hay: con exactOptionalPropertyTypes la
// página lo declara opcional pero no admite un undefined explícito.
async function renderPage(params: Params, searchParams?: Search) {
  const { default: AuditEditPage } = await import("../page");
  return render(
    <AuditEditPage
      params={params}
      {...(searchParams ? { searchParams } : {})}
    />
  );
}

// `use` suspende el componente hasta que la promesa resuelve, así que los
// params entregados como promesa necesitan un límite de Suspense y esperar.
async function renderSuspendedPage(params: Params, searchParams?: Search) {
  const { default: AuditEditPage } = await import("../page");
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<span>loading</span>}>
        <AuditEditPage
          params={params}
          {...(searchParams ? { searchParams } : {})}
        />
      </Suspense>
    );
  });
  await waitFor(() => expect(screen.queryByText("loading")).toBeNull());
  return result;
}

describe("AuditEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubDetail();
  });

  it("loads the audit of the route with resolved params", async () => {
    await renderPage({ id: "audit-1" });

    expect(useAuditDetail).toHaveBeenCalledWith("audit-1");
    expect(propsOf("content").id).toBe("audit-1");
  });

  it("resolves params delivered as a promise", async () => {
    await renderSuspendedPage(Promise.resolve({ id: "audit-2" }));

    expect(useAuditDetail).toHaveBeenCalledWith("audit-2");
  });

  it("resolves searchParams delivered as a promise", async () => {
    await renderSuspendedPage(
      { id: "audit-1" },
      Promise.resolve({ auditor: "jane" })
    );

    expect(propsOf("header").auditor).toBe("jane");
  });

  it("takes the auditor from the query over the one in the detail", async () => {
    await renderPage({ id: "audit-1" }, { auditor: "jane" });

    expect(propsOf("header").auditor).toBe("jane");
    expect(propsOf("panel").auditorName).toBe("jane");
  });

  it("falls back to the auditor of the detail when the query has none", async () => {
    await renderPage({ id: "audit-1" });

    expect(propsOf("header").auditor).toBe("");
    expect(propsOf("panel").auditorName).toBe("detail-auditor");
  });

  it("passes the flow name, status and dates to the header", async () => {
    await renderPage({ id: "audit-1" });

    expect(propsOf("header")).toMatchObject({
      title: "Curb ramps",
      status: "final_report_sent_to_client",
      createdAt: "2026-01-15T10:30:00Z",
      updatedAt: "2026-01-16T11:00:00Z",
      backHref: "/audits",
    });
  });

  it("passes the project, facility and location to the panel", async () => {
    await renderPage({ id: "audit-1" });

    expect(propsOf("panel")).toMatchObject({
      projectName: "Proyecto Norte",
      facilityName: "Planta",
      location: "Front entry",
    });
  });

  it("uses the review status as the default while there is no detail", async () => {
    stubDetail({ data: undefined, isLoading: true });

    await renderPage({ id: "audit-1" });

    expect(propsOf("header")).toMatchObject({
      title: "",
      status: "draft_report_in_review",
      createdAt: "",
      updatedAt: "",
    });
    expect(propsOf("content").isAuditDetailLoading).toBe(true);
  });

  it("shows the retry action on error and hides the content", async () => {
    const refetch = stubDetail({ data: undefined, isError: true });

    await renderPage({ id: "audit-1" });

    expect(screen.queryByTestId("content")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "The audit could not be loaded." })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
