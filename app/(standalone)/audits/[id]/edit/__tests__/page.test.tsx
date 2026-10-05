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
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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
    <>
      <header data-testid="header">{JSON.stringify(props)}</header>
      {typeof props.onBack === "function" && (
        <button onClick={props.onBack as () => void}>header back</button>
      )}
    </>
  ),
}));

vi.mock("@features/audits/ui/AuditInfoPanel", () => ({
  default: (props: Record<string, unknown>) => (
    <section data-testid="panel">{JSON.stringify(props)}</section>
  ),
}));

vi.mock("@features/audits/ui/AuditEditContent", () => ({
  default: (props: Record<string, unknown>) => {
    const onDirtyChange = props.onDirtyChange as (dirty: boolean) => void;
    return (
      <>
        <div data-testid="content">{JSON.stringify(props)}</div>
        <button onClick={() => onDirtyChange(true)}>edit report</button>
        <button onClick={() => onDirtyChange(false)}>save report</button>
      </>
    );
  },
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
type SearchValues = { auditor?: string; returnTo?: string };
type Search = SearchValues | Promise<SearchValues>;

// La página se tipa como pide Next 15 (promesas) pero en runtime acepta las dos
// formas; el cast deja que los tests ejerciten ambas.
const asParams = (params: Params) => params as Promise<{ id: string }>;
const asSearch = (search: Search) => search as Promise<SearchValues>;

// searchParams se omite cuando no hay: con exactOptionalPropertyTypes la
// página lo declara opcional pero no admite un undefined explícito.
async function renderPage(params: Params, searchParams?: Search) {
  const { default: AuditEditPage } = await import("../page");
  return render(
    <AuditEditPage
      params={asParams(params)}
      {...(searchParams ? { searchParams: asSearch(searchParams) } : {})}
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
          params={asParams(params)}
          {...(searchParams ? { searchParams: asSearch(searchParams) } : {})}
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

  it("goes back to the source project when returnTo names one", async () => {
    await renderPage({ id: "audit-1" }, { returnTo: "/projects/project-1" });

    expect(propsOf("header").backHref).toBe("/projects/project-1");
  });

  it("ignores a returnTo that is not a project page", async () => {
    await renderPage({ id: "audit-1" }, { returnTo: "https://evil.example.com" });

    expect(propsOf("header").backHref).toBe("/audits");
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

  it("leaves through the back link while there are no unsaved changes", async () => {
    await renderPage({ id: "audit-1" });

    expect(screen.queryByRole("button", { name: "header back" })).toBeNull();
  });

  it("asks before leaving with unsaved changes and goes back on confirm", async () => {
    await renderPage({ id: "audit-1" }, { returnTo: "/projects/p-1?status=completed" });

    await userEvent.click(screen.getByRole("button", { name: "edit report" }));
    await userEvent.click(screen.getByRole("button", { name: "header back" }));
    expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Discard and leave" }));
    expect(push).toHaveBeenCalledWith("/projects/p-1?status=completed");
  });

  it("stays on the page when the leave is cancelled", async () => {
    await renderPage({ id: "audit-1" });

    await userEvent.click(screen.getByRole("button", { name: "edit report" }));
    await userEvent.click(screen.getByRole("button", { name: "header back" }));
    await userEvent.click(screen.getByRole("button", { name: "Stay" }));

    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Discard unsaved changes?")).toBeNull());
  });

  it("warns the browser before unloading only while there are unsaved changes", async () => {
    await renderPage({ id: "audit-1" });
    const unload = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(unload()).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "edit report" }));
    expect(unload()).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "save report" }));
    expect(unload()).toBe(false);
  });
});
